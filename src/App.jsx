import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInAnonymously, 
    onAuthStateChanged, 
    signOut 
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    onSnapshot, 
    collection, 
    updateDoc, 
    getDoc, 
    deleteDoc 
} from 'firebase/firestore';

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA8yYgSZrftifnWBklIz1UVOwBRO65vj9k",
  authDomain: "tnt-training.firebaseapp.com",
  projectId: "tnt-training",
  storageBucket: "tnt-training.firebasestorage.app",
  messagingSenderId: "791420900421",
  appId: "1:791420900421:web:deb9dffb55ef1b3febff2c",
  measurementId: "G-B74Q9T0KMB"
};
const appID = firebaseConfig.appId.split(':')[1];

// Initialisation de Firebase
let app;
let db;
let auth;
let isFirebaseConnected = false;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  isFirebaseConnected = true;
  console.log("Firebase a été initialisé avec succès.");
} catch (e) {
  console.error("Erreur lors de l'initialisation de Firebase:", e);
}

// Liste des exercices et leurs points
const EXERCISES = [
  { name: 'Étirements', points: 5, unit: 'minutes', pointsPer: 10, group: 'Groupe 3' },
  { name: 'Gainage (Statique/Dynamique)', points: 2, unit: 'secondes', pointsPer: 30, group: 'Groupe 3' },
  { name: 'Basket', points: 10, unit: 'minutes', pointsPer: 30, group: 'Groupe 1' },
  { name: 'Corde à sauter', points: 3, unit: 'minutes', pointsPer: 1, group: 'Groupe 2' },
  { name: 'Course à pied (piste)', points: 5, unit: 'km', pointsPer: 1, group: 'Groupe 2' },
  { name: 'Course à pied (forêt)', points: 7, unit: 'km', pointsPer: 1, group: 'Groupe 2' },
  { name: 'Course à pied (plage)', points: 10, unit: 'km', pointsPer: 1, group: 'Groupe 2' },
  { name: 'Natation (piscine)', points: 1, unit: 'longueurs (25m)', pointsPer: 1, group: 'Groupe 2' },
  { name: 'Natation (mer)', points: 5, unit: 'minutes', pointsPer: 5, group: 'Groupe 2' },
  { name: 'Sport nautique', points: 10, unit: 'minutes', pointsPer: 30, group: 'Groupe 1' },
  { name: 'Sport de raquettes', points: 10, unit: 'minutes', pointsPer: 30, group: 'Groupe 1' },
  { name: 'Vélo (Elliptique/Appartement)', points: 4, unit: 'km', pointsPer: 1, group: 'Groupe 2' },
  { name: 'Vélo (Route)', points: 5, unit: 'km', pointsPer: 1, group: 'Groupe 2' },
  { name: 'Vélo (VTT)', points: 7, unit: 'km', pointsPer: 1, group: 'Groupe 2' },
  { name: 'Autres sports', points: 10, unit: 'minutes', pointsPer: 30, group: 'Groupe 1' },
  { name: 'Abdominaux', points: 2, unit: 'séries', pointsPer: 10, group: 'Groupe 3' }
];

// Composant pour le menu burger
const BurgerMenu = ({ currentUser, handleLogout, players }) => {
    const [isOpen, setIsOpen] = useState(false);
    const currentPlayer = players.find(p => p.name === currentUser?.displayName);
    const totalPoints = currentPlayer ? currentPlayer.totalPoints : 0;
    const progress = Math.min((totalPoints / 200) * 100, 100);

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="text-white focus:outline-none p-2 rounded-full hover:bg-gray-800 transition-colors">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-2" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        <div className="block px-4 py-2 text-sm text-gray-300 border-b border-gray-700 font-semibold">
                            {currentUser.displayName || `Utilisateur #${currentUser.uid.substring(0, 4)}...`}
                            <div className="mt-2 text-xs text-gray-400">Progression : {totalPoints.toFixed(1)}/200 pts</div>
                            <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                                <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors"
                            role="menuitem"
                        >
                            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Déconnexion
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Composant principal de l'application
const App = () => {
    const [players, setPlayers] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [newPlayerName, setNewPlayerName] = useState('');
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // Initialisation de l'authentification anonyme
    useEffect(() => {
        if (!isFirebaseConnected || !auth) {
            console.error("Firebase n'est pas connecté. L'application ne fonctionnera pas correctement.");
            return;
        }

        const unsub = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUser(user);
            } else {
                try {
                    await signInAnonymously(auth);
                    setCurrentUser(null);
                } catch (error) {
                    console.error("Erreur lors de l'authentification anonyme:", error);
                }
            }
            setIsAuthReady(true);
        });

        return () => unsub();
    }, []);

    // Récupération des joueurs
    useEffect(() => {
        if (isAuthReady && isFirebaseConnected && db) {
            const playersRef = collection(db, `artifacts/${appID}/public/data/players`);
            const unsub = onSnapshot(playersRef, (snapshot) => {
                const playersData = snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id
                }));
                // Tri par points décroissants
                playersData.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
                setPlayers(playersData);

                // Si le joueur sélectionné n'existe plus, on désélectionne
                if (selectedPlayer && !playersData.some(p => p.id === selectedPlayer.id)) {
                    setSelectedPlayer(null);
                }
            }, (error) => {
                console.error("Erreur lors de la récupération des joueurs:", error);
            });

            return () => unsub();
        }
    }, [isAuthReady, isFirebaseConnected, db, selectedPlayer]);

    // Fonctions CRUD pour les joueurs et activités
    const addPlayer = async () => {
        if (newPlayerName.trim() === '') return;
        if (!isFirebaseConnected || !currentUser) return;

        const playersRef = collection(db, `artifacts/${appID}/public/data/players`);
        try {
            await setDoc(doc(playersRef), {
                name: newPlayerName,
                activities: [],
                totalPoints: 0
            });
            setNewPlayerName('');
        } catch (e) {
            console.error("Erreur lors de l'ajout du joueur:", e);
        }
    };

    const addActivity = async (playerId, activity) => {
        if (!isFirebaseConnected || !currentUser) return;
        
        const playerDocRef = doc(db, `artifacts/${appID}/public/data/players/${playerId}`);
        const activityRef = doc(collection(playerDocRef, 'activities'));

        try {
            const docSnap = await getDoc(playerDocRef);
            if (docSnap.exists()) {
                const exerciseDetails = EXERCISES.find(e => e.name === activity.exercise);
                if (!exerciseDetails) {
                    console.error("Exercice non trouvé.");
                    return;
                }
                const points = (activity.quantity / exerciseDetails.pointsPer) * exerciseDetails.points;
                const newTotalPoints = (docSnap.data().totalPoints || 0) + points;
                await updateDoc(playerDocRef, { totalPoints: newTotalPoints });
                await setDoc(activityRef, {
                    ...activity,
                    points: points,
                    creatorUid: currentUser.uid,
                    createdAt: new Date().toISOString()
                });
            }
        } catch (e) {
            console.error("Erreur lors de l'ajout de l'activité:", e);
        }
    };

    const deleteActivity = async (playerId, activityId) => {
        if (!isFirebaseConnected || !currentUser) return;

        const playerDocRef = doc(db, `artifacts/${appID}/public/data/players/${playerId}`);
        const activityDocRef = doc(db, `artifacts/${appID}/public/data/players/${playerId}/activities/${activityId}`);

        try {
            const activitySnap = await getDoc(activityDocRef);
            if (activitySnap.exists() && activitySnap.data().creatorUid === currentUser.uid) {
                const playerSnap = await getDoc(playerDocRef);
                const oldTotalPoints = playerSnap.data().totalPoints || 0;
                const pointsToRemove = activitySnap.data().points;
                const newTotalPoints = Math.max(0, oldTotalPoints - pointsToRemove);
                
                await updateDoc(playerDocRef, { totalPoints: newTotalPoints });
                await deleteDoc(activityDocRef);
            } else {
                console.error("Permission refusée ou activité non trouvée.");
            }
        } catch (e) {
            console.error("Erreur lors de la suppression de l'activité:", e);
        }
    };

    const handleLogout = async () => {
        if (isFirebaseConnected && auth) {
            try {
                await signOut(auth);
                // Utilisation de la redirection vers la racine de l'application
                window.location.href = window.location.origin;
            } catch (error) {
                console.error("Erreur lors de la déconnexion:", error);
            }
        }
    };

    const PlayerDetails = ({ player, onBack }) => {
        const [activities, setActivities] = useState([]);
        const [isModalOpen, setIsModalOpen] = useState(false);
        const [newActivity, setNewActivity] = useState({ date: '', exercise: '', quantity: '' });
        const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
        const [activityToDelete, setActivityToDelete] = useState(null);
        const [deleting, setDeleting] = useState(false);
        const [message, setMessage] = useState('');

        useEffect(() => {
            if (isFirebaseConnected && player && db) {
                const activitiesRef = collection(db, `artifacts/${appID}/public/data/players/${player.id}/activities`);
                const unsub = onSnapshot(activitiesRef, (snapshot) => {
                    const activitiesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    activitiesList.sort((a, b) => new Date(b.date) - new Date(a.date));
                    setActivities(activitiesList);
                });
                return () => unsub();
            }
        }, [player]);

        const handleAddActivity = (e) => {
            e.preventDefault();
            if (newActivity.date && newActivity.exercise && newActivity.quantity) {
                addActivity(player.id, newActivity);
                setNewActivity({ date: '', exercise: '', quantity: '' });
                setIsModalOpen(false);
            }
        };

        const handleOpenDeleteConfirmation = (activity) => {
            if (activity.creatorUid === currentUser?.uid) {
                setActivityToDelete(activity);
                setShowDeleteConfirmation(true);
            } else {
                setMessage('Vous ne pouvez supprimer que les activités que vous avez ajoutées.');
                setTimeout(() => setMessage(''), 3000);
            }
        };

        const handleDeleteActivity = () => {
            setDeleting(true);
            deleteActivity(player.id, activityToDelete.id);
            setDeleting(false);
            setShowDeleteConfirmation(false);
            setActivityToDelete(null);
        };
        
        const renderGroupProgress = (groupName) => {
          const groupGoals = {
            'Groupe 1': { goal: 50, color: 'bg-orange-500' },
            'Groupe 2': { goal: 50, color: 'bg-green-500' },
            'Groupe 3': { goal: 50, color: 'bg-teal-500' },
          };
          const { goal, color } = groupGoals[groupName];
          const points = activities
              .filter(act => {
                  const ex = EXERCISES.find(e => e.name === act.exercise);
                  return ex && ex.group === groupName;
              })
              .reduce((sum, act) => sum + act.points, 0);
          const progress = Math.min((points / goal) * 100, 100);

          return (
            <div className="flex items-center space-x-2 w-full">
              <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div className={`${color} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${progress}%` }}></div>
              </div>
              <span className="text-sm font-medium text-white">{points.toFixed(1)} / {goal} Pts</span>
            </div>
          );
        };
        
        return (
            <div className="p-6 bg-gray-900 rounded-3xl shadow-2xl border border-gray-700">
                <button
                    onClick={onBack}
                    className="mb-6 text-orange-400 font-bold hover:text-orange-300 transition-colors duration-200"
                >
                    &larr; Retour au classement
                </button>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-orange-400">{player.name}</h2>
                    <span className="text-3xl font-extrabold text-white">{player.totalPoints.toFixed(1)} Pts</span>
                </div>

                <div className="mb-6 space-y-4">
                  <h3 className="text-xl font-semibold text-gray-200">Points par groupe:</h3>
                  {['Groupe 1', 'Groupe 2', 'Groupe 3'].map(groupName => (
                      <div key={groupName}>
                          <p className="text-gray-300 font-medium mb-1">{groupName}</p>
                          {renderGroupProgress(groupName)}
                      </div>
                  ))}
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full p-4 mb-6 bg-orange-500 text-white font-bold rounded-2xl shadow-md hover:bg-orange-600 transition-colors duration-200"
                >
                    Ajouter une activité
                </button>

                <h3 className="text-xl font-bold text-orange-400 mb-4">Historique des activités</h3>
                <ul className="space-y-4">
                    {activities.length > 0 ? (
                        activities.map(activity => (
                            <li key={activity.id} className="bg-gray-800 p-4 rounded-2xl shadow-md flex justify-between items-center border border-gray-700">
                                <div>
                                    <p className="text-lg font-semibold text-white">{activity.exercise}</p>
                                    <p className="text-sm text-gray-400">
                                        {activity.quantity} {EXERCISES.find(e => e.name === activity.exercise)?.unit} - le {activity.date}
                                    </p>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <span className="text-xl font-bold text-orange-400">{activity.points.toFixed(1)} pts</span>
                                    {activity.creatorUid === currentUser?.uid && (
                                        <button
                                            onClick={() => handleOpenDeleteConfirmation(activity)}
                                            className="text-red-500 hover:text-red-600 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))
                    ) : (
                        <p className="text-gray-400 italic text-center">Aucune activité enregistrée pour ce joueur.</p>
                    )}
                </ul>

                {isModalOpen && (
                    <div className="fixed inset-0 bg-gray-950 bg-opacity-80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-gray-900 p-8 rounded-3xl shadow-2xl w-full max-w-md border border-gray-700">
                            <h3 className="text-2xl font-bold text-orange-400 mb-6">Ajouter une activité</h3>
                            <form onSubmit={handleAddActivity} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={newActivity.date}
                                        onChange={(e) => setNewActivity({ ...newActivity, date: e.target.value })}
                                        className="w-full p-2 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Activité</label>
                                    <select
                                        value={newActivity.exercise}
                                        onChange={(e) => setNewActivity({ ...newActivity, exercise: e.target.value })}
                                        className="w-full p-2 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        required
                                    >
                                        <option value="" disabled>Sélectionnez une activité</option>
                                        {EXERCISES.map(ex => (
                                            <option key={ex.name} value={ex.name}>
                                                {ex.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Quantité</label>
                                    <input
                                        type="number"
                                        value={newActivity.quantity}
                                        onChange={(e) => setNewActivity({ ...newActivity, quantity: e.target.value })}
                                        className="w-full p-2 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        required
                                    />
                                </div>
                                <div className="flex justify-end space-x-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-6 py-2 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition-colors"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-orange-500 text-white font-bold rounded-full hover:bg-orange-600 transition-colors"
                                    >
                                        Enregistrer
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
                {showDeleteConfirmation && (
                    <div className="fixed inset-0 bg-gray-950 bg-opacity-80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-gray-900 p-8 rounded-3xl shadow-2xl w-full max-w-md border border-gray-700">
                            <h3 className="text-2xl font-bold text-red-400 mb-4 text-center">Confirmer la suppression</h3>
                            <p className="text-gray-300 mb-6 text-center">
                                Êtes-vous sûr de vouloir supprimer l'activité <span className="font-bold text-orange-400">{activityToDelete.exercise}</span> du <span className="font-bold">{activityToDelete.date}</span> ? Cette action est irréversible.
                            </p>
                            {message && <p className="text-sm text-center text-red-400 mb-4">{message}</p>}
                            <div className="flex justify-center space-x-4">
                                <button
                                    onClick={() => setShowDeleteConfirmation(false)}
                                    disabled={deleting}
                                    className="px-6 py-2 bg-gray-700 text-white rounded-full shadow-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleDeleteActivity}
                                    disabled={deleting}
                                    className="px-6 py-2 bg-red-600 text-white font-bold rounded-full shadow-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                >
                                    {deleting ? 'Suppression...' : 'Supprimer'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-950 text-gray-200 font-sans p-4 md:p-8">
            <header className="flex items-center justify-between flex-wrap gap-4 mb-8">
                <div className="flex items-center space-x-4">
                    <img
                        src="https://static.wixstatic.com/media/613e2c_49bfb0765aa44b0b8211af156607e247~mv2.png/v1/fill/w_77,h_77,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/613e2c_49bfb0765aa44b0b8211af156607e247~mv2.png"
                        alt="Logo"
                        className="h-16 w-16 md:h-20 md:w-20"
                        onError={(e) => e.target.src = "https://placehold.co/80x80/000/FFF?text=Logo"}
                    />
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white hidden md:block">
                        <span className="text-orange-400">Suivi </span>
                        <span className="text-gray-400">d'entraînements</span>
                    </h1>
                </div>
                {/* Message de bienvenue et menu burger alignés à droite */}
                <div className="flex items-center space-x-4">
                    {currentUser && players.some(p => p.name === currentUser.displayName) && (
                        <div className="text-right hidden md:block">
                            <p className="text-sm text-gray-300">Bonjour,</p>
                            <p className="text-xl font-bold text-orange-400">{currentUser.displayName || 'Utilisateur'}</p>
                            <div className="mt-2 text-xs text-gray-400">Progression : {players.find(p => p.name === currentUser.displayName)?.totalPoints.toFixed(1) || 0}/200 pts</div>
                            <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                                <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${Math.min(((players.find(p => p.name === currentUser.displayName)?.totalPoints || 0) / 200) * 100, 100)}%` }}></div>
                            </div>
                        </div>
                    )}
                    {currentUser && <BurgerMenu currentUser={currentUser} handleLogout={handleLogout} players={players} />}
                </div>
            </header>

            <div className="max-w-7xl mx-auto">
                {selectedPlayer ? (
                    <PlayerDetails player={selectedPlayer} onBack={() => setSelectedPlayer(null)} />
                ) : (
                    <>
                        {/* Section d'ajout de joueur */}
                        <div className="p-6 bg-gray-900 rounded-3xl shadow-2xl mb-8 border border-gray-700">
                            <h2 className="text-2xl font-bold text-orange-400 mb-4">Ajouter un joueur</h2>
                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                                <input
                                    type="text"
                                    value={newPlayerName}
                                    onChange={(e) => setNewPlayerName(e.target.value)}
                                    placeholder="Nom du joueur"
                                    className="flex-grow p-3 bg-gray-800 text-white rounded-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                                <button
                                    onClick={addPlayer}
                                    className="p-3 bg-orange-500 text-white font-bold rounded-full hover:bg-orange-600 transition-colors duration-200"
                                >
                                    Ajouter
                                </button>
                            </div>
                        </div>

                        {/* Classement des joueurs */}
                        <div className="p-6 bg-gray-900 rounded-3xl shadow-2xl border border-gray-700">
                            <h2 className="text-2xl font-bold text-orange-400 mb-4">Classement des joueurs</h2>
                            <ul className="space-y-4">
                                {players.map((player, index) => (
                                    <li key={player.id}>
                                        <button
                                            onClick={() => setSelectedPlayer(player)}
                                            className="w-full text-left p-4 bg-gray-800 rounded-2xl shadow-md hover:bg-gray-700 transition-colors duration-200 flex items-center justify-between"
                                        >
                                            <div className="flex items-center space-x-4">
                                                <span className="text-xl font-extrabold text-orange-400 w-8 text-center">{index + 1}.</span>
                                                <span className="text-lg font-semibold text-white">{player.name}</span>
                                            </div>
                                            <span className="text-xl font-bold text-orange-400">{player.totalPoints.toFixed(1)} Pts</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </>
                )}
            </div>
            
            <footer className="mt-8 text-center text-xs text-gray-500">
                <p>Version 3.4.0</p>
            </footer>
        </div>
    );
};

export default App;
