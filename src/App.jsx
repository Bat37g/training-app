import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';

// Initialisation de Firebase avec les configurations fournies par l'environnement
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  // Configuration fournie par l'utilisateur
  apiKey: "AIzaSyA8yYgSZrftifnWBklIz1UVOwBRO65vj9k",
  authDomain: "tnt-training.firebaseapp.com",
  projectId: "tnt-training",
  storageBucket: "tnt-training.firebasestorage.app",
  messagingSenderId: "791420900421",
  appId: "1:791420900421:web:deb9dffb55ef1b3febff2c",
  measurementId: "G-B74Q9T0KMB"
};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

let app;
let db;
let auth;
let isFirebaseConnected = false;

if (Object.keys(firebaseConfig).length > 0) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    isFirebaseConnected = true;
    console.log("Firebase a été initialisé avec succès.");
  } catch (e) {
    console.error("Erreur lors de l'initialisation de Firebase:", e);
  }
} else {
  console.error("La configuration Firebase est manquante. L'application fonctionnera en mode local (non-persistant).");
}

const EXERCISES = [
  { name: 'Étirements', points: 5, unit: 'minutes', pointsPer: 10 },
  { name: 'Pompes', points: 10, unit: 'répétitions', pointsPer: 5 },
  { name: 'Gainage', points: 15, unit: 'minutes', pointsPer: 15 },
  { name: 'Corde à sauter', points: 20, unit: 'minutes', pointsPer: 10 },
  { name: 'Course à pied', points: 25, unit: 'minutes', pointsPer: 15 },
  { name: 'Squats', points: 5, unit: 'répétitions', pointsPer: 5 },
  { name: 'Fentes', points: 5, unit: 'répétitions', pointsPer: 5 },
  { name: 'Abdominaux', points: 10, unit: 'répétitions', pointsPer: 5 },
  { name: 'Tractions', points: 15, unit: 'répétitions', pointsPer: 5 },
  { name: 'Dips', points: 10, unit: 'répétitions', pointsPer: 5 },
  { name: 'Rameur', points: 20, unit: 'minutes', pointsPer: 10 },
  { name: 'Vélo', points: 25, unit: 'minutes', pointsPer: 10 },
  { name: 'Natation', points: 30, unit: 'minutes', pointsPer: 15 },
  { name: 'Boxe', points: 35, unit: 'minutes', pointsPer: 15 },
  { name: 'CrossFit', points: 40, unit: 'minutes', pointsPer: 20 },
];

const App = () => {
  // === GESTION DE L'ÉTAT DE L'APPLICATION ===
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userId, setUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(true); // Faux pour l'instant, à adapter plus tard
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'admin'

  // === GESTION DES MODALES ET FORMULAIRES ===
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');

  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [activityValue, setActivityValue] = useState(0);
  const [activityDate, setActivityDate] = useState('');
  const [addingActivity, setAddingActivity] = useState(false);

  const [isEditingActivity, setIsEditingActivity] = useState(false);
  const [activityToEdit, setActivityToEdit] = useState(null);
  const [editingActivity, setEditingActivity] = useState(false);

  const [isDeletingActivity, setIsDeletingActivity] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');

  const [isConfirmingDeletePlayer, setIsConfirmingDeletePlayer] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState(null);
  const [deletingPlayer, setDeletingPlayer] = useState(false);

  // === AUTHENTIFICATION ET CHARGEMENT INITIAL ===
  useEffect(() => {
    if (!isFirebaseConnected) {
      setLoading(false);
      setIsAuthReady(true);
      return;
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
      } else if (initialAuthToken) {
        try {
          const userCredential = await signInWithCustomToken(auth, initialAuthToken);
          setUserId(userCredential.user.uid);
        } catch (authError) {
          console.error("Erreur lors de la connexion avec le jeton personnalisé:", authError);
          setUserId(crypto.randomUUID());
        }
      } else {
        try {
          const userCredential = await signInAnonymously(auth);
          setUserId(userCredential.user.uid);
        } catch (authError) {
          console.error("Erreur lors de la connexion anonyme:", authError);
          setUserId(crypto.randomUUID());
        }
      }
      setIsAuthReady(true);
    });

    return () => unsub();
  }, []);

  // === CHARGEMENT DES JOUEURS (ABONNEMENT EN TEMPS RÉEL) ===
  useEffect(() => {
    if (!isFirebaseConnected || !isAuthReady || !userId) return;

    const playersCollectionRef = collection(db, "artifacts", appId, "public", "data", "players");
    const unsub = onSnapshot(playersCollectionRef, (snapshot) => {
      const playersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        activities: doc.data().activities || []
      }));
      setPlayers(playersList);
      setLoading(false);
    }, (err) => {
      console.error("Erreur de chargement des joueurs:", err);
      setError("Impossible de charger les données. Veuillez réessayer.");
      setLoading(false);
    });

    return () => unsub();
  }, [isFirebaseConnected, isAuthReady, userId]);

  // === LOGIQUE DE L'APPLICATION ===
  const handleSignOut = async () => {
    if (!isFirebaseConnected) return;
    try {
      await signOut(auth);
      // Réinitialiser les états
      setUserId(null);
      setSelectedPlayer(null);
      setCurrentView('dashboard');
      setPlayers([]);
      setError('');
      setIsMenuOpen(false);
      console.log("Déconnexion réussie.");
    } catch (e) {
      console.error("Erreur lors de la déconnexion:", e);
      setError("Erreur lors de la déconnexion.");
    }
  };

  const handleAddPlayer = async () => {
    if (newPlayerName.trim() === '') return;
    setLoading(true);
    try {
      const playerDocRef = doc(db, "artifacts", appId, "public", "data", "players", newPlayerName);
      await setDoc(playerDocRef, {
        name: newPlayerName,
        activities: []
      });
      setNewPlayerName('');
      setIsAddingPlayer(false);
      setError('');
    } catch (e) {
      console.error("Erreur d'ajout du joueur:", e);
      setError("Erreur lors de l'ajout du joueur.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddActivity = (player) => {
    setSelectedPlayer(player);
    setSelectedExercise(EXERCISES[0].name);
    setActivityValue('');
    setActivityDate(new Date().toISOString().substring(0, 10));
    setIsAddingActivity(true);
  };

  const handleAddActivity = async () => {
    if (!selectedPlayer || !selectedExercise || !activityValue || !activityDate) return;

    setAddingActivity(true);
    const exercise = EXERCISES.find(ex => ex.name === selectedExercise);
    const newActivity = {
      id: Date.now(),
      exercise: selectedExercise,
      value: Number(activityValue),
      date: activityDate,
      points: Math.floor(Number(activityValue) / exercise.pointsPer) * exercise.points
    };

    try {
      const playerDocRef = doc(db, "artifacts", appId, "public", "data", "players", selectedPlayer.id);
      const playerDoc = await getDoc(playerDocRef);
      const currentActivities = playerDoc.data().activities || [];
      await updateDoc(playerDocRef, {
        activities: [...currentActivities, newActivity]
      });
      setIsAddingActivity(false);
      setError('');
    } catch (e) {
      console.error("Erreur d'ajout de l'activité:", e);
      setError("Erreur lors de l'ajout de l'activité.");
    } finally {
      setAddingActivity(false);
    }
  };

  const handleOpenEditActivity = (player, activity) => {
    setSelectedPlayer(player);
    setActivityToEdit(activity);
    setSelectedExercise(activity.exercise);
    setActivityValue(activity.value);
    setActivityDate(activity.date);
    setIsEditingActivity(true);
  };

  const handleEditActivity = async () => {
    if (!selectedPlayer || !activityToEdit || !selectedExercise || !activityValue || !activityDate) return;

    setEditingActivity(true);
    const exercise = EXERCISES.find(ex => ex.name === selectedExercise);
    const updatedActivity = {
      id: activityToEdit.id,
      exercise: selectedExercise,
      value: Number(activityValue),
      date: activityDate,
      points: Math.floor(Number(activityValue) / exercise.pointsPer) * exercise.points
    };

    try {
      const playerDocRef = doc(db, "artifacts", appId, "public", "data", "players", selectedPlayer.id);
      const playerDoc = await getDoc(playerDocRef);
      const currentActivities = playerDoc.data().activities || [];
      const updatedActivities = currentActivities.map(act => act.id === activityToEdit.id ? updatedActivity : act);
      await updateDoc(playerDocRef, { activities: updatedActivities });
      setIsEditingActivity(false);
      setActivityToEdit(null);
      setError('');
    } catch (e) {
      console.error("Erreur de modification de l'activité:", e);
      setError("Erreur lors de la modification de l'activité.");
    } finally {
      setEditingActivity(false);
    }
  };

  const handleOpenDeleteConfirmation = (player, activity) => {
    setSelectedPlayer(player);
    setActivityToDelete(activity);
    setIsDeletingActivity(true);
  };

  const handleCloseDeleteConfirmation = () => {
    setIsDeletingActivity(false);
    setActivityToDelete(null);
    setMessage('');
  };

  const handleDeleteActivity = async () => {
    if (!selectedPlayer || !activityToDelete) return;

    setDeleting(true);
    try {
      const playerDocRef = doc(db, "artifacts", appId, "public", "data", "players", selectedPlayer.id);
      const playerDoc = await getDoc(playerDocRef);
      const currentActivities = playerDoc.data().activities || [];
      const updatedActivities = currentActivities.filter(act => act.id !== activityToDelete.id);
      await updateDoc(playerDocRef, { activities: updatedActivities });
      handleCloseDeleteConfirmation();
      setError('');
    } catch (e) {
      console.error("Erreur de suppression de l'activité:", e);
      setMessage("Erreur lors de la suppression de l'activité.");
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenDeletePlayerConfirmation = (player) => {
    setPlayerToDelete(player);
    setIsConfirmingDeletePlayer(true);
  };

  const handleCloseDeletePlayerConfirmation = () => {
    setIsConfirmingDeletePlayer(false);
    setPlayerToDelete(null);
  };

  const handleDeletePlayer = async () => {
    if (!playerToDelete) return;

    setDeletingPlayer(true);
    try {
      const playerDocRef = doc(db, "artifacts", appId, "public", "data", "players", playerToDelete.id);
      await deleteDoc(playerDocRef);
      handleCloseDeletePlayerConfirmation();
      setError('');
    } catch (e) {
      console.error("Erreur de suppression du joueur:", e);
      setError("Erreur lors de la suppression du joueur.");
    } finally {
      setDeletingPlayer(false);
    }
  };


  const calculateTotalPoints = (player) => {
    if (!player || !player.activities) return 0;
    return player.activities.reduce((total, activity) => total + activity.points, 0);
  };

  // Trier les joueurs par points décroissants
  const sortedPlayers = [...players].sort((a, b) => calculateTotalPoints(b) - calculateTotalPoints(a));

  const getPointsForActivity = (activity) => {
    const exercise = EXERCISES.find(ex => ex.name === activity.exercise);
    if (!exercise) return 0;
    return Math.floor(Number(activity.value) / exercise.pointsPer) * exercise.points;
  };

  // === RENDU DE L'APPLICATION ===
  return (
    <div className="bg-gray-900 min-h-screen p-8 text-white font-sans antialiased relative pb-16">
      <div className="max-w-7xl mx-auto">
        {/* En-tête de l'application avec le menu burger */}
        <header className="flex justify-between items-center mb-12">
          <button onClick={() => setIsMenuOpen(true)} className="p-2 text-gray-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-grow text-center">
            <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">
              Tableau de Bord
            </h1>
            <p className="text-center text-gray-400 text-lg">
              Suivez les performances de vos joueurs.
            </p>
          </div>
          {/* Bouton pour ajouter un joueur, si sur le dashboard */}
          {currentView === 'dashboard' && !selectedPlayer && !isAddingPlayer && (
            <button
              onClick={() => setIsAddingPlayer(true)}
              className="bg-orange-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-orange-600 transition-transform transform hover:scale-105 font-semibold text-sm"
            >
              Ajouter un Joueur
            </button>
          )}
        </header>

        {/* Menu latéral (burger) */}
        <div className={`fixed inset-y-0 left-0 bg-gray-800 w-64 p-8 z-50 transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`}>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold text-white">Menu</h2>
            <button onClick={() => setIsMenuOpen(false)} className="p-2 text-gray-400 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-gray-400 mb-6">Connecté en tant que:</p>
          <p className="text-white font-bold mb-8 break-all">{userId}</p>
          <ul className="space-y-4">
            <li>
              <button onClick={() => { setCurrentView('dashboard'); setIsMenuOpen(false); }} className="text-orange-400 hover:text-orange-500 transition-colors w-full text-left">
                Tableau de Bord
              </button>
            </li>
            {isAdmin && (
              <li>
                <button onClick={() => { setCurrentView('admin'); setIsMenuOpen(false); }} className="text-orange-400 hover:text-orange-500 transition-colors w-full text-left">
                  Gérer les joueurs
                </button>
              </li>
            )}
            <li>
              <button onClick={handleSignOut} className="bg-red-600 text-white px-4 py-2 rounded-full w-full text-left hover:bg-red-700 transition-colors mt-8">
                Déconnexion
              </button>
            </li>
          </ul>
        </div>
        {isMenuOpen && <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40" onClick={() => setIsMenuOpen(false)}></div>}

        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-orange-500"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-800 p-4 rounded-lg shadow-lg text-center mb-6">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Vue principale : Tableau de bord des joueurs */}
        {!loading && !selectedPlayer && currentView === 'dashboard' && (
          <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-gray-100">Classement des Joueurs</h2>
              {isAddingPlayer && (
                <div className="flex items-center space-x-4">
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    placeholder="Nom du joueur"
                    className="flex-grow bg-gray-800 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    onClick={handleAddPlayer}
                    className="bg-green-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-green-700 transition-transform transform hover:scale-105 font-semibold"
                  >
                    Confirmer
                  </button>
                  <button
                    onClick={() => setIsAddingPlayer(false)}
                    className="bg-gray-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-gray-500 transition-transform transform hover:scale-105 font-semibold"
                  >
                    Annuler
                  </button>
                </div>
              )}
            </div>
            {!isAddingPlayer && (
              <div className="space-y-4">
                {sortedPlayers.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Aucun joueur n'a encore été ajouté.</p>
                ) : (
                  sortedPlayers.map((player) => (
                    <div key={player.id} className="bg-gray-700 p-5 rounded-xl shadow-md flex items-center justify-between transition-all duration-300 hover:bg-gray-600">
                      <div
                        className="flex-grow cursor-pointer"
                        onClick={() => setSelectedPlayer(player)}
                      >
                        <h3 className="text-2xl font-bold text-orange-400">{player.name}</h3>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-3xl font-extrabold text-orange-400">
                          {calculateTotalPoints(player)} pts
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDeletePlayerConfirmation(player);
                          }}
                          className="p-2 text-red-400 hover:text-red-600 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Vue principale : Détails du joueur */}
        {selectedPlayer && currentView === 'dashboard' && (
          <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setSelectedPlayer(null)}
                className="text-gray-400 hover:text-orange-500 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div className="flex-grow text-center">
                <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">
                  {selectedPlayer.name}
                </h2>
                <p className="text-gray-400 text-xl"><span className="font-bold">{calculateTotalPoints(selectedPlayer)} pts</span></p>
              </div>
              <button
                onClick={() => handleOpenAddActivity(selectedPlayer)}
                className="bg-orange-500 text-white px-6 py-3 rounded-full shadow-lg hover:bg-orange-600 transition-transform transform hover:scale-105 font-semibold text-sm md:text-base"
              >
                Ajouter une Activité
              </button>
            </div>

            <div className="mt-8">
              <h3 className="text-2xl font-bold text-gray-100 mb-4">Historique des Activités</h3>
              {selectedPlayer.activities.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Aucune activité n'a encore été enregistrée pour ce joueur.</p>
              ) : (
                <div className="space-y-4">
                  {selectedPlayer.activities.map((activity) => (
                    <div key={activity.id} className="bg-gray-700 p-5 rounded-xl shadow-md flex items-center justify-between transition-all duration-300 hover:bg-gray-600">
                      <div className="flex-grow">
                        <p className="text-lg font-semibold text-orange-400">{activity.exercise}</p>
                        <p className="text-gray-300 text-sm">{activity.date}</p>
                        <p className="text-gray-400 text-sm">Valeur: {activity.value}</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-2xl font-bold text-green-400">{getPointsForActivity(activity)} pts</span>
                        <button
                          onClick={() => handleOpenEditActivity(selectedPlayer, activity)}
                          className="p-2 text-blue-400 hover:text-blue-600 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                            <path d="M2 13.5V17a2 2 0 002 2h3.5a2 2 0 000-4H4a2 2 0 00-2 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleOpenDeleteConfirmation(selectedPlayer, activity)}
                          className="p-2 text-red-400 hover:text-red-600 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Vue principale : Page d'administration */}
        {!loading && currentView === 'admin' && (
          <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-gray-100">Gérer les joueurs</h2>
              <button
                onClick={() => setCurrentView('dashboard')}
                className="text-gray-400 hover:text-orange-500 transition-colors"
              >
                Retour au tableau de bord
              </button>
            </div>
            <div className="space-y-4">
              {players.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Aucun joueur n'a encore été ajouté.</p>
              ) : (
                players.map((player) => (
                  <div key={player.id} className="bg-gray-700 p-5 rounded-xl shadow-md flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-orange-400">{player.name}</h3>
                    </div>
                    <button
                      onClick={() => handleOpenDeletePlayerConfirmation(player)}
                      className="p-2 text-red-400 hover:text-red-600 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* === MODALES === */}
        {/* Modale d'ajout d'activité */}
        {isAddingActivity && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-lg">
              <h3 className="text-2xl font-bold text-white mb-4">Ajouter une activité pour {selectedPlayer.name}</h3>
              <div className="space-y-4 mb-6">
                <div>
                  <label htmlFor="exercise" className="block text-gray-400 mb-2">Exercice</label>
                  <select
                    id="exercise"
                    value={selectedExercise}
                    onChange={(e) => setSelectedExercise(e.target.value)}
                    className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {EXERCISES.map((ex) => (
                      <option key={ex.name} value={ex.name}>{ex.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="value" className="block text-gray-400 mb-2">Valeur ({EXERCISES.find(ex => ex.name === selectedExercise)?.unit})</label>
                  <input
                    id="value"
                    type="number"
                    value={activityValue}
                    onChange={(e) => setActivityValue(e.target.value)}
                    className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label htmlFor="date" className="block text-gray-400 mb-2">Date</label>
                  <input
                    id="date"
                    type="date"
                    value={activityDate}
                    onChange={(e) => setActivityDate(e.target.value)}
                    className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setIsAddingActivity(false)}
                  disabled={addingActivity}
                  className="px-6 py-2 bg-gray-700 text-white rounded-full shadow-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddActivity}
                  disabled={addingActivity}
                  className="px-6 py-2 bg-orange-500 text-white font-bold rounded-full shadow-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {addingActivity ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modale d'édition d'activité */}
        {isEditingActivity && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-lg">
              <h3 className="text-2xl font-bold text-white mb-4">Modifier l'activité de {selectedPlayer.name}</h3>
              <div className="space-y-4 mb-6">
                <div>
                  <label htmlFor="edit-exercise" className="block text-gray-400 mb-2">Exercice</label>
                  <select
                    id="edit-exercise"
                    value={selectedExercise}
                    onChange={(e) => setSelectedExercise(e.target.value)}
                    className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {EXERCISES.map((ex) => (
                      <option key={ex.name} value={ex.name}>{ex.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-value" className="block text-gray-400 mb-2">Valeur ({EXERCISES.find(ex => ex.name === selectedExercise)?.unit})</label>
                  <input
                    id="edit-value"
                    type="number"
                    value={activityValue}
                    onChange={(e) => setActivityValue(e.target.value)}
                    className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label htmlFor="edit-date" className="block text-gray-400 mb-2">Date</label>
                  <input
                    id="edit-date"
                    type="date"
                    value={activityDate}
                    onChange={(e) => setActivityDate(e.target.value)}
                    className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setIsEditingActivity(false)}
                  disabled={editingActivity}
                  className="px-6 py-2 bg-gray-700 text-white rounded-full shadow-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleEditActivity}
                  disabled={editingActivity}
                  className="px-6 py-2 bg-orange-500 text-white font-bold rounded-full shadow-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {editingActivity ? 'Modification...' : 'Modifier'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modale de confirmation de suppression d'activité */}
        {isDeletingActivity && (
            <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
                <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-lg">
                    <h3 className="text-2xl font-bold text-white mb-4">Confirmer la suppression</h3>
                    <p className="text-gray-300 mb-6">
                        Êtes-vous sûr de vouloir supprimer l'activité <span className="font-bold text-orange-400">{activityToDelete.exercise}</span> du <span className="font-bold">{activityToDelete.date}</span> pour <span className="font-bold">{selectedPlayer.name}</span> ? Cette action est irréversible.
                    </p>
                    {message && <p className="text-sm text-center text-red-400 mb-4">Erreur: {message}</p>}
                    <div className="flex justify-end space-x-4">
                        <button
                            onClick={handleCloseDeleteConfirmation}
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

        {/* Modale de confirmation de suppression de joueur */}
        {isConfirmingDeletePlayer && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
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

      </div>
      <footer className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-gray-500 text-sm">
        Version 3.8.2
      </footer>
    </div>
  );
};

export default App;
