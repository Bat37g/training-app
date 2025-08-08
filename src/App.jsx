import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, updateDoc, getDoc } from 'firebase/firestore';

// Initialisation de Firebase avec les configurations fournies par l'environnement
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

let app;
let db;
let auth;

// Ne pas initialiser si la configuration est manquante
if (Object.keys(firebaseConfig).length > 0) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log("Firebase a été initialisé avec succès.");
  } catch (e) {
    console.error("Erreur lors de l'initialisation de Firebase:", e);
  }
} else {
  console.error("La configuration Firebase est manquante.");
}

// Les exercices sont maintenant associés à des groupes spécifiques basés sur le document PDF
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

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (!auth) {
            console.error("L'instance d'authentification n'est pas disponible.");
            return;
        }
        
        if (initialAuthToken) {
          await signInWithCustomToken(auth, initialAuthToken);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Erreur lors de l'authentification:", error);
      }
    };
    if (Object.keys(firebaseConfig).length > 0 && !isAuthenticated) {
      initializeAuth();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!auth) {
      console.log("L'instance d'authentification n'est pas prête.");
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        setUserId(user.uid);
        console.log("Utilisateur authentifié:", user.uid);
      } else {
        setIsAuthenticated(false);
        setUserId(null);
        console.log("Utilisateur déconnecté.");
      }
    });

    return () => unsubscribe();
  }, []);


  useEffect(() => {
    if (db && userId) {
      const usersRef = collection(db, 'artifacts', appId, 'users', userId, 'players');
      const unsubscribe = onSnapshot(usersRef, (snapshot) => {
        const playersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPlayers(playersList);

        // Si le joueur sélectionné n'est plus dans la liste, le désélectionner
        if (selectedPlayer && !playersList.some(p => p.id === selectedPlayer.id)) {
          setSelectedPlayer(null);
          setActivities([]);
        }
      });
      return () => unsubscribe();
    }
  }, [db, userId, appId, selectedPlayer]);

  useEffect(() => {
    if (db && userId && selectedPlayer) {
      const playerActivitiesRef = collection(db, 'artifacts', appId, 'users', userId, 'players', selectedPlayer.id, 'activities');
      const unsubscribe = onSnapshot(playerActivitiesRef, (snapshot) => {
        const activitiesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setActivities(activitiesList);
      });
      return () => unsubscribe();
    } else {
      setActivities([]);
    }
  }, [db, userId, appId, selectedPlayer]);


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
    if (playerName && db && userId) {
      const newPlayerRef = doc(collection(db, 'artifacts', appId, 'users', userId, 'players'));
      await setDoc(newPlayerRef, { name: playerName, createdAt: new Date() });
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
      const activityRef = doc(collection(db, 'artifacts', appId, 'users', userId, 'players', selectedPlayer.id, 'activities'));
      await setDoc(activityRef, newActivity);
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
    if (activityToDelete && db && userId && selectedPlayer) {
      setDeleting(true);
      try {
        const activityRef = doc(db, 'artifacts', appId, 'users', userId, 'players', selectedPlayer.id, 'activities', activityToDelete.id);
        await setDoc(activityRef, {}, { merge: false }); // Utiliser setDoc avec un document vide pour une suppression 'douce'
        handleCloseDeleteConfirmation();
        setMessage('');
      } catch (error) {
        console.error("Erreur lors de la suppression de l'activité:", error);
        setMessage('Erreur lors de la suppression. Veuillez réessayer.');
      } finally {
        setDeleting(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="container mx-auto max-w-4xl">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-teal-400">Suivi d'activités TNT U12</h1>
          <p className="text-gray-400">ID Utilisateur: {userId ? userId : 'En attente...'}</p>
        </header>

        {/* Section de gestion des joueurs */}
        <section className="mb-8 p-6 bg-gray-800 rounded-xl shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-200">Joueurs</h2>
            <button
              onClick={handleAddPlayer}
              className="px-4 py-2 bg-teal-500 text-white font-bold rounded-full hover:bg-teal-600 transition-colors"
            >
              Ajouter un joueur
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {players.map(player => (
              <button
                key={player.id}
                onClick={() => handleSelectPlayer(player)}
                className={`px-4 py-2 rounded-full transition-colors ${
                  selectedPlayer && selectedPlayer.id === player.id
                    ? 'bg-teal-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {player.name}
              </button>
            ))}
          </div>
        </section>

        {/* Section d'activités */}
        {selectedPlayer && (
          <section className="p-6 bg-gray-800 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-teal-400">{selectedPlayer.name}</h2>
              <button
                onClick={handleOpenModal}
                className="px-4 py-2 bg-teal-500 text-white font-bold rounded-full hover:bg-teal-600 transition-colors"
              >
                Ajouter une activité
              </button>
            </div>

            {/* Affichage des points par groupe */}
            <div className="mb-4 text-center">
              <h3 className="text-lg font-semibold text-gray-200 mb-2">Points par groupe:</h3>
              <div className="flex justify-center gap-4 text-sm font-medium">
                <span className={`p-2 rounded-lg ${getGroupPoints('Groupe 1') >= 50 ? 'bg-green-600' : 'bg-red-600'}`}>
                  Groupe 1: {getGroupPoints('Groupe 1')} / 50
                </span>
                <span className={`p-2 rounded-lg ${getGroupPoints('Groupe 2') >= 50 ? 'bg-green-600' : 'bg-red-600'}`}>
                  Groupe 2: {getGroupPoints('Groupe 2')} / 50
                </span>
                <span className={`p-2 rounded-lg ${getGroupPoints('Groupe 3') >= 50 ? 'bg-green-600' : 'bg-red-600'}`}>
                  Groupe 3: {getGroupPoints('Groupe 3')} / 50
                </span>
              </div>
            </div>

            <div className="text-center mb-4 p-4 bg-gray-700 rounded-lg">
              <span className="text-xl font-bold text-white">
                Total des points: {getTotalPoints()}
              </span>
              <p className="text-sm text-gray-400">Objectif: 200 points par semaine minimum</p>
              {getTotalPoints() >= 200 ? (
                <span className="text-green-400 text-sm font-semibold">Objectif atteint !</span>
              ) : (
                <span className="text-red-400 text-sm font-semibold">Objectif non atteint.</span>
              )}
            </div>

            {activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map(activity => (
                  <div key={activity.id} className="bg-gray-700 p-4 rounded-xl shadow flex items-center justify-between">
                    <div>
                      <p className="text-gray-300 text-sm">Date: <span className="font-semibold text-white">{activity.date}</span></p>
                      <p className="text-lg font-bold text-teal-400">{activity.exercise}</p>
                      <p className="text-gray-300 text-sm">{activity.value} {EXERCISES.find(e => e.name === activity.exercise)?.unit}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-extrabold text-white">{calculatePoints(activity)} Pts</p>
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
              <p className="text-center text-gray-400">Aucune activité enregistrée pour ce joueur.</p>
            )}
          </section>
        )}

        {/* Modal pour ajouter une activité */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4">
            <div className="bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-md">
              <h3 className="text-2xl font-bold text-white mb-4">Ajouter une activité pour {selectedPlayer.name}</h3>
              {message && <p className="text-sm text-center text-red-400 mb-4">{message}</p>}
              <form onSubmit={handleAddActivity} className="space-y-4">
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-300">Date</label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={newActivity.date}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label htmlFor="exercise" className="block text-sm font-medium text-gray-300">Activité</label>
                  <select
                    id="exercise"
                    name="exercise"
                    value={newActivity.exercise}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-teal-500 focus:border-teal-500"
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
                  <label htmlFor="value" className="block text-sm font-medium text-gray-300">Valeur ({newActivity.exercise ? EXERCISES.find(e => e.name === newActivity.exercise)?.unit : 'Unité'})</label>
                  <input
                    type="number"
                    id="value"
                    name="value"
                    value={newActivity.value}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Ex: 5, 30, 250"
                  />
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={loading}
                    className="px-4 py-2 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-teal-500 text-white font-bold rounded-full hover:bg-teal-600 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Ajout...' : 'Ajouter'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de confirmation de suppression */}
        {showDeleteConfirmation && (
            <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4">
                <div className="bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-md">
                    <h3 className="text-2xl font-bold text-white mb-4">Confirmer la suppression</h3>
                    <p className="text-gray-300 mb-4">
                        Êtes-vous sûr de vouloir supprimer l'activité <span className="font-bold">{activityToDelete.exercise}</span> du <span className="font-bold">{activityToDelete.date}</span> pour <span className="font-bold">{selectedPlayer.name}</span> ? Cette action est irréversible.
                    </p>
                    {message && <p className="text-sm text-center text-red-400 mb-4">Erreur: {message}</p>}
                    <div className="flex justify-end space-x-4">
                        <button
                            onClick={handleCloseDeleteConfirmation}
                            disabled={deleting}
                            className="px-4 py-2 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition-colors disabled:opacity-50"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleDeleteActivity}
                            disabled={deleting}
                            className="px-4 py-2 bg-red-500 text-white font-bold rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
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
