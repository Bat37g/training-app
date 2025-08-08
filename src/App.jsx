import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, updateDoc, getDoc, deleteDoc, runTransaction } from 'firebase/firestore';

// Initialisation de Firebase avec les configurations fournies par l'environnement
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

let app;
let db;
let auth;
let isFirebaseInitialized = false;

// Initialiser Firebase si ce n'est pas déjà fait
const initializeFirebase = async () => {
  if (!isFirebaseInitialized) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    isFirebaseInitialized = true;
    
    // Si un jeton d'authentification personnalisé est fourni, l'utiliser. Sinon, se connecter anonymement.
    try {
      if (initialAuthToken) {
        await signInWithCustomToken(auth, initialAuthToken);
      } else {
        await signInAnonymously(auth);
      }
      console.log("Firebase Authentification réussie");
    } catch (error) {
      console.error("Erreur lors de l'authentification Firebase:", error);
    }
  }
};


const App = () => {
  const [player, setPlayer] = useState(null);
  const [activities, setActivities] = useState([]);
  const [newActivity, setNewActivity] = useState({ date: '', type: '', duration: 0, distance: 0 });
  const [editActivity, setEditActivity] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState(null);
  const [deletingPlayer, setDeletingPlayer] = useState(false);

  useEffect(() => {
    initializeFirebase();
    // Gérer les changements d'état d'authentification
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthReady(true);
      if (user) {
        // L'utilisateur est connecté, écouter les données du joueur
        const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'players', user.uid);
        const playerUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setPlayer({ id: docSnap.id, ...docSnap.data() });
          } else {
            console.log("Aucun document de joueur trouvé pour l'utilisateur. Création d'un nouveau joueur.");
            const newPlayer = {
              name: 'Nouveau joueur',
              totalDistance: 0,
              totalDuration: 0,
              lastActivityDate: null
            };
            setDoc(userDocRef, newPlayer).then(() => {
              setPlayer({ id: docSnap.id, ...newPlayer });
            }).catch(error => {
              console.error("Erreur lors de la création du joueur:", error);
            });
          }
        });
        
        // Écouter les activités du joueur
        const activitiesColRef = collection(db, 'artifacts', appId, 'users', user.uid, 'activities');
        const activitiesUnsubscribe = onSnapshot(activitiesColRef, (snapshot) => {
          const fetchedActivities = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          setActivities(fetchedActivities);
        });
        
        return () => {
          playerUnsubscribe();
          activitiesUnsubscribe();
        };
      } else {
        setPlayer(null);
        setActivities([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewActivity(prev => ({ ...prev, [name]: name === 'duration' || name === 'distance' ? parseFloat(value) || 0 : value }));
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    if (!isAuthReady || !auth.currentUser) return;
    try {
      const activitiesColRef = collection(db, 'artifacts', appId, 'users', auth.currentUser.uid, 'activities');
      await runTransaction(db, async (transaction) => {
        const playerDocRef = doc(db, 'artifacts', appId, 'users', auth.currentUser.uid, 'players', auth.currentUser.uid);
        const playerDoc = await transaction.get(playerDocRef);
        if (!playerDoc.exists()) {
          throw "Le document du joueur n'existe pas !";
        }
        
        const currentData = playerDoc.data();
        const updatedTotalDistance = currentData.totalDistance + newActivity.distance;
        const updatedTotalDuration = currentData.totalDuration + newActivity.duration;
        
        transaction.update(playerDocRef, {
          totalDistance: updatedTotalDistance,
          totalDuration: updatedTotalDuration,
          lastActivityDate: newActivity.date,
        });

        const newActivityRef = doc(activitiesColRef);
        transaction.set(newActivityRef, {
          ...newActivity,
          createdAt: new Date(),
        });
      });
      setNewActivity({ date: '', type: '', duration: 0, distance: 0 });
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'activité:", error);
    }
  };

  const handleEdit = (activity) => {
    setEditActivity(activity);
    setNewActivity(activity);
  };

  const handleUpdateActivity = async (e) => {
    e.preventDefault();
    if (!isAuthReady || !auth.currentUser || !editActivity) return;
    
    const oldActivity = activities.find(a => a.id === editActivity.id);
    const activityDocRef = doc(db, 'artifacts', appId, 'users', auth.currentUser.uid, 'activities', editActivity.id);

    try {
      await runTransaction(db, async (transaction) => {
        const playerDocRef = doc(db, 'artifacts', appId, 'users', auth.currentUser.uid, 'players', auth.currentUser.uid);
        const playerDoc = await transaction.get(playerDocRef);
        if (!playerDoc.exists()) {
          throw "Le document du joueur n'existe pas !";
        }
        
        const currentData = playerDoc.data();
        const updatedTotalDistance = currentData.totalDistance - oldActivity.distance + newActivity.distance;
        const updatedTotalDuration = currentData.totalDuration - oldActivity.duration + newActivity.duration;
        
        transaction.update(playerDocRef, {
          totalDistance: updatedTotalDistance,
          totalDuration: updatedTotalDuration,
          lastActivityDate: newActivity.date,
        });

        transaction.update(activityDocRef, newActivity);
      });
      setEditActivity(null);
      setNewActivity({ date: '', type: '', duration: 0, distance: 0 });
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'activité:", error);
    }
  };

  const handleDeleteActivity = async (activityId) => {
    if (!isAuthReady || !auth.currentUser) return;
    
    const activityToDelete = activities.find(a => a.id === activityId);
    if (!activityToDelete) return;
    
    const activityDocRef = doc(db, 'artifacts', appId, 'users', auth.currentUser.uid, 'activities', activityId);

    try {
      await runTransaction(db, async (transaction) => {
        const playerDocRef = doc(db, 'artifacts', appId, 'users', auth.currentUser.uid, 'players', auth.currentUser.uid);
        const playerDoc = await transaction.get(playerDocRef);
        if (!playerDoc.exists()) {
          throw "Le document du joueur n'existe pas !";
        }
        
        const currentData = playerDoc.data();
        const updatedTotalDistance = currentData.totalDistance - activityToDelete.distance;
        const updatedTotalDuration = currentData.totalDuration - activityToDelete.duration;

        transaction.update(playerDocRef, {
          totalDistance: updatedTotalDistance,
          totalDuration: updatedTotalDuration,
        });

        transaction.delete(activityDocRef);
      });
    } catch (error) {
      console.error("Erreur lors de la suppression de l'activité:", error);
    }
  };
  
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Erreur de déconnexion:", error);
    }
  };

  const handleOpenDeletePlayerConfirmation = () => {
    if (player) {
      setPlayerToDelete(player);
    }
  };

  const handleCloseDeletePlayerConfirmation = () => {
    setPlayerToDelete(null);
  };

  const handleDeletePlayer = async () => {
    if (!playerToDelete || !auth.currentUser) return;

    setDeletingPlayer(true);
    try {
      // Pour une suppression correcte, il faut supprimer toutes les sous-collections d'abord.
      // Dans Firestore, il n'y a pas de suppression en cascade, donc nous devons les supprimer manuellement.
      const activitiesColRef = collection(db, 'artifacts', appId, 'users', auth.currentUser.uid, 'activities');
      const activitiesSnapshot = await getDocs(activitiesColRef);
      const deleteActivitiesPromises = activitiesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deleteActivitiesPromises);

      // Supprimer le document du joueur principal après les activités
      const playerDocRef = doc(db, 'artifacts', appId, 'users', auth.currentUser.uid, 'players', auth.currentUser.uid);
      await deleteDoc(playerDocRef);

      // Enfin, se déconnecter
      await signOut(auth);
      
      console.log("Joueur et toutes les activités supprimés avec succès.");
      setPlayerToDelete(null);
    } catch (error) {
      console.error("Erreur lors de la suppression du joueur et de ses activités:", error);
    } finally {
      setDeletingPlayer(false);
    }
  };

  // Afficher un message de chargement tant que l'authentification n'est pas prête
  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-xl animate-pulse">Chargement de l'application...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col items-center p-4 sm:p-8 relative">
      <header className="w-full max-w-4xl flex justify-between items-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-orange-400 drop-shadow-lg">
          Gestion des activités
        </h1>
        <div className="flex items-center space-x-4">
          {player && (
            <span className="text-sm sm:text-base font-medium text-gray-300">
              Bienvenue, {player.name} !
            </span>
          )}
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-colors text-sm sm:text-base font-bold"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <div className="w-full max-w-4xl bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-2xl space-y-8">
        {/* Affichage des statistiques du joueur */}
        {player && (
          <div className="bg-gray-700 p-6 rounded-xl shadow-inner border border-gray-600">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Statistiques du joueur</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="bg-gray-800 p-4 rounded-lg shadow-md">
                <p className="text-xs text-gray-400 uppercase tracking-widest">Distance Totale</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-400 mt-2">{player.totalDistance} km</p>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg shadow-md">
                <p className="text-xs text-gray-400 uppercase tracking-widest">Durée Totale</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-400 mt-2">{player.totalDuration} min</p>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg shadow-md">
                <p className="text-xs text-gray-400 uppercase tracking-widest">Dernière activité</p>
                <p className="text-xl sm:text-2xl font-bold text-orange-400 mt-2">
                  {player.lastActivityDate ? player.lastActivityDate : 'N/A'}
                </p>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={handleOpenDeletePlayerConfirmation}
                className="px-4 py-2 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-colors text-sm font-bold"
              >
                Supprimer le joueur et les activités
              </button>
            </div>
          </div>
        )}
        
        {/* Formulaire d'ajout/modification d'activité */}
        <div className="bg-gray-700 p-6 rounded-xl shadow-inner border border-gray-600">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
            {editActivity ? 'Modifier l\'activité' : 'Ajouter une nouvelle activité'}
          </h2>
          <form onSubmit={editActivity ? handleUpdateActivity : handleAddActivity} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="date"
                name="date"
                value={newActivity.date}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <select
                name="type"
                value={newActivity.type}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Sélectionner le type</option>
                <option value="Course à pied">Course à pied</option>
                <option value="Vélo">Vélo</option>
                <option value="Natation">Natation</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="number"
                name="duration"
                value={newActivity.duration}
                onChange={handleInputChange}
                placeholder="Durée (en minutes)"
                required
                className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <input
                type="number"
                name="distance"
                value={newActivity.distance}
                onChange={handleInputChange}
                placeholder="Distance (en km)"
                required
                className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="flex justify-end space-x-4">
              {editActivity && (
                <button
                  type="button"
                  onClick={() => {
                    setEditActivity(null);
                    setNewActivity({ date: '', type: '', duration: 0, distance: 0 });
                  }}
                  className="px-6 py-2 bg-gray-600 text-white rounded-full shadow-lg hover:bg-gray-500 transition-colors font-bold"
                >
                  Annuler
                </button>
              )}
              <button
                type="submit"
                className="px-6 py-2 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600 transition-colors font-bold"
              >
                {editActivity ? 'Mettre à jour' : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>

        {/* Liste des activités */}
        <div className="bg-gray-700 p-6 rounded-xl shadow-inner border border-gray-600">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Historique des activités</h2>
          <div className="overflow-x-auto">
            {activities.length > 0 ? (
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="text-gray-400 uppercase text-sm leading-normal">
                    <th className="py-3 px-6 text-left">Date</th>
                    <th className="py-3 px-6 text-left">Type</th>
                    <th className="py-3 px-6 text-center">Durée (min)</th>
                    <th className="py-3 px-6 text-center">Distance (km)</th>
                    <th className="py-3 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-white text-sm font-light">
                  {activities.sort((a, b) => new Date(b.date) - new Date(a.date)).map((activity) => (
                    <tr key={activity.id} className="border-b border-gray-600 hover:bg-gray-600">
                      <td className="py-3 px-6 text-left whitespace-nowrap">{activity.date}</td>
                      <td className="py-3 px-6 text-left">{activity.type}</td>
                      <td className="py-3 px-6 text-center">{activity.duration}</td>
                      <td className="py-3 px-6 text-center">{activity.distance}</td>
                      <td className="py-3 px-6 text-center">
                        <div className="flex item-center justify-center space-x-2">
                          <button
                            onClick={() => handleEdit(activity)}
                            className="text-orange-400 hover:text-orange-300 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zm-2.121 2.121l-14.646 14.646-.707.707h4.95l14.646-14.646a2 2 0 00-2.828-2.828l-1.061 1.061z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteActivity(activity.id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-400 text-center py-4">Aucune activité enregistrée pour le moment.</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Modale de confirmation de suppression du joueur */}
      {playerToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-lg">
            <h3 className="text-2xl font-bold text-white mb-4">Confirmer la suppression du joueur</h3>
            <p className="text-gray-300 mb-6">
              Êtes-vous sûr de vouloir supprimer le joueur <span className="font-bold text-orange-400">{playerToDelete.name}</span> et toutes ses activités ? Cette action est irréversible.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={handleCloseDeletePlayerConfirmation}
                disabled={deletingPlayer}
                className="px-6 py-2 bg-gray-700 text-white rounded-full shadow-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDeletePlayer}
                disabled={deletingPlayer}
                className="px-6 py-2 bg-red-600 text-white font-bold rounded-full shadow-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deletingPlayer ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-gray-500 text-xs">
        <p>Propulsé par Google et propulsé par Gemini</p>
      </footer>
    </div>
  );
};

export default App;
