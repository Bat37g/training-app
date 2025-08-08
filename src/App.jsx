import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';

// Votre configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA8yYgSZrftifnWBklIz1UVOwBRO65vj9k",
  authDomain: "tnt-training.firebaseapp.com",
  projectId: "tnt-training",
  storageBucket: "tnt-training.firebasestorage.app",
  messagingSenderId: "791420900421",
  appId: "1:791420900421:web:deb9dffb55ef1b3febff2c",
  measurementId: "G-B74Q9T0KMB"
};

// Initialisation de Firebase
let app;
let db;
let auth;
let isFirebaseConnected = false;
const PROJECT_ID = "tnt-training";

// Vérifier que la configuration est bien présente avant d'initialiser
if (firebaseConfig.apiKey) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    isFirebaseConnected = true;
    console.log("Firebase a été initialisé avec succès avec la configuration Vercel.");
  } catch (e) {
    console.error("Erreur lors de l'initialisation de Firebase:", e);
  }
} else {
  console.error("La configuration Firebase est manquante. L'application fonctionnera en mode local (non-persistant).");
}

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

const getGroupGoals = () => ({
  'Groupe 1': { goal: 50, color: 'bg-orange-500' },
  'Groupe 2': { goal: 50, color: 'bg-sky-500' },
  'Groupe 3': { goal: 50, color: 'bg-violet-500' },
});

const getExerciseIcon = (exerciseName) => {
  switch (exerciseName) {
    case 'Basket': return '🏀';
    case 'Corde à sauter': return '🤸‍♀️';
    case 'Course à pied (piste)':
    case 'Course à pied (forêt)':
    case 'Course à pied (plage)': return '🏃';
    case 'Natation (piscine)':
    case 'Natation (mer)': return '🏊';
    case 'Sport nautique': return '⛵';
    case 'Sport de raquettes': return '🏸';
    case 'Vélo (Elliptique/Appartement)':
    case 'Vélo (Route)':
    case 'Vélo (VTT)': return '🚴‍♀️';
    case 'Étirements': return '🧘‍♀️';
    case 'Gainage (Statique/Dynamique)': return '💪';
    case 'Abdominaux': return '🤸';
    case 'Autres sports': return '🏆';
    default: return '✅';
  }
};


const App = () => {
  const [userId, setUserId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [activities, setActivities] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newActivity, setNewActivity] = useState({
    date: '',
    exercise: '',
    value: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [isFirebaseReady, setIsFirebaseReady] = useState(isFirebaseConnected);

  // Authentification anonyme au chargement de l'application
  useEffect(() => {
    if (isFirebaseConnected) {
      const initializeAuth = async () => {
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error("Erreur lors de l'authentification anonyme:", error);
          setIsFirebaseReady(false);
        }
      };
      initializeAuth();
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          setUserId(user.uid);
          setIsFirebaseReady(true);
          console.log("Utilisateur authentifié de manière anonyme:", user.uid);
        } else {
          setUserId(null);
          setIsFirebaseReady(false);
          console.log("Utilisateur déconnecté.");
        }
      });
      return () => unsubscribe();
    }
  }, []);

  // Écoute des changements de la collection de joueurs
  useEffect(() => {
    if (isFirebaseReady && db) {
      const playersCollectionPath = `artifacts/${PROJECT_ID}/public/data/players`;
      const usersRef = collection(db, playersCollectionPath);
      const unsubscribe = onSnapshot(usersRef, (snapshot) => {
        const playersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPlayers(playersList);
        if (selectedPlayer && !playersList.some(p => p.id === selectedPlayer.id)) {
          setSelectedPlayer(null);
          setActivities([]);
        }
      });
      return () => unsubscribe();
    }
  }, [db, isFirebaseReady, selectedPlayer]);

  // Écoute des changements de la collection d'activités
  useEffect(() => {
    if (isFirebaseReady && db && selectedPlayer) {
      const activitiesCollectionPath = `artifacts/${PROJECT_ID}/public/data/players/${selectedPlayer.id}/activities`;
      const playerActivitiesRef = collection(db, activitiesCollectionPath);
      const unsubscribe = onSnapshot(playerActivitiesRef, (snapshot) => {
        const activitiesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setActivities(activitiesList);
      });
      return () => unsubscribe();
    } else if (!isFirebaseReady && selectedPlayer) {
      setActivities([]);
    }
  }, [db, isFirebaseReady, selectedPlayer]);


  const calculatePoints = (activity) => {
    const exercise = EXERCISES.find(ex => ex.name === activity.exercise);
    if (!exercise) return 0;
    const value = parseFloat(activity.value);
    if (isNaN(value)) return 0;
    return (value / exercise.pointsPer) * exercise.points;
  };

  const getGroupPoints = (groupName) => {
    return activities
      .filter(act => {
        const ex = EXERCISES.find(e => e.name === act.exercise);
        return ex && ex.group === groupName;
      })
      .reduce((sum, act) => sum + calculatePoints(act), 0);
  };

  const getTotalPoints = () => {
    return activities.reduce((sum, act) => sum + calculatePoints(act), 0);
  };

  const handleAddPlayer = async () => {
    const playerName = prompt("Entrez le nom du nouveau joueur:");
    if (playerName) {
      if (isFirebaseReady && db) {
        const playersCollectionPath = `artifacts/${PROJECT_ID}/public/data/players`;
        const newPlayerRef = doc(collection(db, playersCollectionPath));
        await setDoc(newPlayerRef, { name: playerName, createdAt: new Date() });
      } else {
        alert("Erreur: Connexion à la base de données impossible.");
      }
    }
  };

  const handleSelectPlayer = (player) => {
    setSelectedPlayer(player);
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setMessage('');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setNewActivity({ date: '', exercise: '', value: '' });
    setMessage('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewActivity(prev => ({ ...prev, [name]: value }));
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    if (!newActivity.date || !newActivity.exercise || !newActivity.value) {
      setMessage('Veuillez remplir tous les champs.');
      return;
    }
    setLoading(true);
    try {
      if (isFirebaseReady && db && selectedPlayer) {
        const activitiesCollectionPath = `artifacts/${PROJECT_ID}/public/data/players/${selectedPlayer.id}/activities`;
        const activityRef = doc(collection(db, activitiesCollectionPath));
        await setDoc(activityRef, newActivity);
      } else {
        alert('Erreur: Connexion à la base de données impossible.');
      }
      setNewActivity({ date: '', exercise: '', value: '' });
      handleCloseModal();
      setMessage('');
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'activité:", error);
      setMessage('Erreur lors de l\'ajout. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDeleteConfirmation = (activity) => {
    setActivityToDelete(activity);
    setShowDeleteConfirmation(true);
  };

  const handleCloseDeleteConfirmation = () => {
    setActivityToDelete(null);
    setShowDeleteConfirmation(false);
    setMessage('');
  };

  const handleDeleteActivity = async () => {
    if (activityToDelete) {
      setDeleting(true);
      try {
        if (isFirebaseReady && db && selectedPlayer) {
          const activitiesCollectionPath = `artifacts/${PROJECT_ID}/public/data/players/${selectedPlayer.id}/activities`;
          const activityRef = doc(db, activitiesCollectionPath, activityToDelete.id);
          await deleteDoc(activityRef);
        } else {
          alert('Erreur: Connexion à la base de données impossible.');
        }
        handleCloseDeleteConfirmation();
        setMessage('');
      } catch (error) {
        console.error("Erreur lors de la suppression de l'activité:", error);
        setMessage('Erreur lors de la suppression. Veuillez réessayer.');
      } finally {
        setDeleting(false);
      }
    } else {
        setMessage('Erreur: Connexion à la base de données impossible.');
    }
  };

  const renderProgressBar = (groupName) => {
    const { goal, color } = getGroupGoals()[groupName];
    const points = getGroupPoints(groupName);
    const progress = Math.min((points / goal) * 100, 100);
    return (
      <div className="flex items-center space-x-2 w-full">
        <div className="w-full bg-gray-600 rounded-full h-2.5">
          <div className={`${color} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${progress}%` }}></div>
        </div>
        <span className="text-sm font-medium text-white">{points.toFixed(1)} / {goal} Pts</span>
      </div>
    );
  };

  const totalPoints = getTotalPoints();
  const totalGoal = 200;
  const totalProgress = Math.min((totalPoints / totalGoal) * 100, 100);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 font-sans">
      <div className="container mx-auto max-w-4xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-white tracking-wider">Suivi d'activités TNT U12</h1>
          <p className="text-gray-400 mt-2">ID Utilisateur: {userId ? userId : 'En attente...'}</p>
          {!isFirebaseReady && (
            <p className="text-red-400 text-sm mt-2">
                Erreur: L'application n'est pas connectée à la base de données. Les données ne sont pas persistantes.
            </p>
          )}
        </header>

        <section className="mb-8 p-6 bg-gray-900 rounded-3xl shadow-2xl border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-teal-400">Joueurs</h2>
            <button
              onClick={handleAddPlayer}
              className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-full shadow-lg hover:from-orange-600 hover:to-amber-600 transition-all duration-300 transform hover:scale-105"
            >
              Ajouter un joueur
            </button>
          </div>
          <div className="flex flex-wrap gap-4">
            {players.map(player => (
              <button
                key={player.id}
                onClick={() => handleSelectPlayer(player)}
                className={`px-6 py-3 rounded-full shadow-md transition-all duration-300 ${
                  selectedPlayer && selectedPlayer.id === player.id
                    ? 'bg-blue-600 text-white font-bold transform scale-105'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {player.name}
              </button>
            ))}
          </div>
        </section>

        {selectedPlayer && (
          <section className="p-6 bg-gray-900 rounded-3xl shadow-2xl border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-teal-400">{selectedPlayer.name}</h2>
              <button
                onClick={handleOpenModal}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-sky-500 text-white font-bold rounded-full shadow-lg hover:from-blue-600 hover:to-sky-600 transition-all duration-300 transform hover:scale-105"
              >
                Ajouter une activité
              </button>
            </div>

            <div className="mb-6 space-y-4">
              <h3 className="text-xl font-semibold text-gray-200">Points par groupe:</h3>
              <div className="space-y-3">
                {Object.keys(getGroupGoals()).map(groupName => (
                  <div key={groupName}>
                    <p className="text-gray-300 font-medium mb-1">{groupName}</p>
                    {renderProgressBar(groupName)}
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6 p-4 bg-gray-800 rounded-2xl shadow-inner border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl font-bold text-white">Total des points</span>
                <span className="text-3xl font-extrabold text-teal-400">{totalPoints.toFixed(1)} Pts</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-4">
                <div className={`bg-gradient-to-r from-teal-400 to-cyan-500 h-4 rounded-full transition-all duration-500`} style={{ width: `${totalProgress}%` }}></div>
              </div>
              <p className="text-sm text-gray-400 mt-2">Objectif: {totalGoal} points par semaine minimum</p>
              {totalPoints >= totalGoal ? (
                <span className="text-green-400 text-sm font-semibold mt-1">Objectif atteint !</span>
              ) : (
                <span className="text-red-400 text-sm font-semibold mt-1">Objectif non atteint.</span>
              )}
            </div>

            {activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map(activity => (
                  <div key={activity.id} className="bg-gray-800 p-4 rounded-xl shadow-md flex items-center justify-between border border-gray-700">
                    <div className="flex items-center space-x-4">
                      <span className="text-3xl">{getExerciseIcon(activity.exercise)}</span>
                      <div>
                        <p className="text-gray-300 text-sm">Date: <span className="font-semibold text-white">{activity.date}</span></p>
                        <p className="text-lg font-bold text-teal-400">{activity.exercise}</p>
                        <p className="text-gray-300 text-sm">{activity.value} {EXERCISES.find(e => e.name === activity.exercise)?.unit}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-extrabold text-white">{calculatePoints(activity).toFixed(1)} Pts</p>
                      <button
                        onClick={() => handleOpenDeleteConfirmation(activity)}
                        className="text-red-400 hover:text-red-500 transition-colors text-sm font-semibold mt-2"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 italic">Aucune activité enregistrée pour ce joueur.</p>
            )}
          </section>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 bg-gray-950 bg-opacity-80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 p-8 rounded-3xl shadow-2xl w-full max-w-md border border-gray-700">
              <h3 className="text-2xl font-bold text-teal-400 mb-6">Ajouter une activité pour {selectedPlayer.name}</h3>
              {message && <p className="text-sm text-center text-red-400 mb-4">{message}</p>}
              <form onSubmit={handleAddActivity} className="space-y-4">
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-300 mb-1">Date</label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={newActivity.date}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label htmlFor="exercise" className="block text-sm font-medium text-gray-300 mb-1">Activité</label>
                  <select
                    id="exercise"
                    name="exercise"
                    value={newActivity.exercise}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="" disabled>Sélectionner une activité</option>
                    {EXERCISES.map(ex => (
                      <option key={ex.name} value={ex.name}>
                        {ex.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="value" className="block text-sm font-medium text-gray-300 mb-1">Valeur ({newActivity.exercise ? EXERCISES.find(e => e.name === newActivity.exercise)?.unit : 'Unité'})</label>
                  <input
                    type="number"
                    id="value"
                    name="value"
                    value={newActivity.value}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Ex: 5, 30, 250"
                  />
                </div>
                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={loading}
                    className="px-6 py-2 bg-gray-700 text-white rounded-full shadow-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold rounded-full shadow-lg hover:from-teal-600 hover:to-cyan-600 transition-all duration-300 disabled:opacity-50"
                  >
                    {loading ? 'Ajout...' : 'Ajouter'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showDeleteConfirmation && (
            <div className="fixed inset-0 bg-gray-950 bg-opacity-80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-gray-900 p-8 rounded-3xl shadow-2xl w-full max-w-md border border-gray-700">
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

      </div>
    </div>
  );
};

export default App;
