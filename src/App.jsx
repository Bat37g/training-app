import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, updateDoc, getDoc, deleteDoc, getDocs } from 'firebase/firestore';

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
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

let app;
let db;
let auth;

// Initialisation de Firebase
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  console.log("Firebase a été initialisé avec succès.");
} catch (e) {
  console.error("Erreur lors de l'initialisation de Firebase:", e);
}

// Les exercices ont été restructurés selon le nouveau tableau
const EXERCISES = [
  // Groupe Rouge
  { id: 1, name: 'Étirements', points: 5, unit: 'minutes', pointsPer: 10, group: 'Groupe Rouge', emoji: '🔴' },
  { id: 2, name: 'Gainage Statique', points: 2, unit: 'secondes', pointsPer: 30, group: 'Groupe Rouge', emoji: '🔴' },
  { id: 3, name: 'Gainage Dynamique', points: 2, unit: 'secondes', pointsPer: 30, group: 'Groupe Rouge', emoji: '🔴' },
  { id: 14, name: 'Sport de raquettes (plat)', points: 10, unit: 'minutes', pointsPer: 30, group: 'Groupe Rouge', emoji: '🔴' },
  { id: 15, name: 'Sport de raquettes (sable)', points: 10, unit: 'minutes', pointsPer: 30, group: 'Groupe Rouge', emoji: '🔴' },
  { id: 19, name: 'Football', points: 10, unit: 'minutes', pointsPer: 30, group: 'Groupe Rouge', emoji: '🔴' },
  { id: 20, name: 'Volley-ball', points: 10, unit: 'minutes', pointsPer: 30, group: 'Groupe Rouge', emoji: '🔴' },
  { id: 21, name: 'Hand-ball', points: 10, unit: 'minutes', pointsPer: 30, group: 'Groupe Rouge', emoji: '🔴' },
  { id: 22, name: 'Abdominaux', points: 2, unit: 'série de 10', pointsPer: 1, group: 'Groupe Rouge', emoji: '🔴' },

  // Groupe Bleu
  { id: 4, name: 'Basket', points: 10, unit: 'minutes', pointsPer: 30, group: 'Groupe Bleu', emoji: '🔵' },
  { id: 9, name: 'Natation (Piscine)', points: 1, unit: 'longueur (25m)', pointsPer: 1, group: 'Groupe Bleu', emoji: '🔵' },
  { id: 10, name: 'Natation (Mer)', points: 5, unit: 'minutes', pointsPer: 5, group: 'Groupe Bleu', emoji: '🔵' },
  { id: 11, name: 'Canoë', points: 10, unit: 'minutes', pointsPer: 30, group: 'Groupe Bleu', emoji: '🔵' },
  { id: 12, name: 'Kayak', points: 10, unit: 'minutes', pointsPer: 30, group: 'Groupe Bleu', emoji: '🔵' },
  { id: 13, name: 'Ski nautique', points: 10, unit: 'minutes', pointsPer: 30, group: 'Groupe Bleu', emoji: '🔵' },
  
  // Groupe Vert
  { id: 5, name: 'Corde à sauter', points: 3, unit: 'minutes', pointsPer: 1, group: 'Groupe Vert', emoji: '🟢' },
  { id: 6, name: 'Course à pied (piste)', points: 5, unit: 'Km', pointsPer: 1, group: 'Groupe Vert', emoji: '🟢' },
  { id: 7, name: 'Course à pied (forêt)', points: 7, unit: 'Km', pointsPer: 1, group: 'Groupe Vert', emoji: '🟢' },
  { id: 8, name: 'Course à pied (plage)', points: 10, unit: 'Km', pointsPer: 1, group: 'Groupe Vert', emoji: '🟢' },
  { id: 16, name: 'Vélo (Elliptique)', points: 4, unit: 'Km', pointsPer: 1, group: 'Groupe Vert', emoji: '🟢' },
  { id: 17, name: 'Vélo (route)', points: 5, unit: 'Km', pointsPer: 1, group: 'Groupe Vert', emoji: '🟢' },
  { id: 18, name: 'Vélo (VTT)', points: 7, unit: 'Km', pointsPer: 1, group: 'Groupe Vert', emoji: '🟢' },
];

// L'ID de l'administrateur
const ADMIN_EMAIL = "batou.code@gmail.com";

const getWeekNumber = (d) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return weekNo;
};

const getBackgroundColor = (points, goal) => {
  const percentage = (points / goal) * 100;
  if (percentage >= 100) return 'bg-orange-500';
  if (percentage >= 50) return 'bg-blue-500';
  return 'bg-red-500';
};

const ProgressBarGauge = ({ points, goal, title, showEmojis = false }) => {
  const percentage = Math.min(100, (points / goal) * 100);
  const progressColor = getBackgroundColor(points, goal);

  const getPointsEmoji = (p) => {
    if (p >= 200) return '🎉';
    if (p >= 150) return '💪';
    if (p >= 100) return '👍';
    if (p >= 50) return '🏃‍♂️';
    return '';
  };
  
  const currentEmoji = getPointsEmoji(points);

  return (
    <div className="w-full flex flex-col items-center p-2 bg-gray-800 rounded-lg shadow-inner">
      <div className="text-sm font-semibold text-gray-300 mb-1">{title}</div>
      <div className="relative w-full h-4 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${progressColor}`}
          style={{ width: `${percentage}%` }}
        ></div>
        {showEmojis && (
          <>
            <span className="absolute left-[25%] top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs opacity-50">🏃‍♂️</span>
            <span className="absolute left-[50%] top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs opacity-50">👍</span>
            <span className="absolute left-[75%] top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs opacity-50">💪</span>
            <span className="absolute left-[100%] top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs opacity-50">🎉</span>
          </>
        )}
      </div>
      <div className="w-full flex justify-between mt-1 text-xs font-mono">
        <span className="text-gray-400">0</span>
        <span className="font-bold text-blue-300">
          {points.toFixed(1)} {currentEmoji} / {goal} pts
        </span>
        <span className="text-gray-400">{goal}</span>
      </div>
    </div>
  );
};

// Nouvelle page pour la gestion des utilisateurs
const UserManagementPage = ({ user, setCurrentPage }) => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playerToDelete, setPlayerToDelete] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deletingPlayer, setDeletingPlayer] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!db) {
        console.error("Firestore n'est pas initialisé.");
        return;
    }
    const playersCollectionRef = collection(db, `artifacts/${appId}/public/data/team_challenge`);
    const unsubscribe = onSnapshot(playersCollectionRef, (snapshot) => {
      const playersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPlayers(playersData);
      setLoading(false);
    }, (error) => {
      console.error("Erreur lors de la récupération des données:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, appId]);

  const handleOpenDeletePlayerConfirmation = (player) => {
      setPlayerToDelete(player);
      setShowDeleteConfirmation(true);
  };

  const handleCloseDeletePlayerConfirmation = () => {
      setPlayerToDelete(null);
      setShowDeleteConfirmation(false);
      setMessage('');
  };

  const handleDeletePlayer = async () => {
      if (!playerToDelete) return;
      setDeletingPlayer(true);
      setMessage('');

      try {
          const playerDocRef = doc(db, `artifacts/${appId}/public/data/team_challenge`, playerToDelete.id);
          await deleteDoc(playerDocRef);
          setMessage(`Le joueur ${playerToDelete.name} a été supprimé.`);
          handleCloseDeletePlayerConfirmation();
      } catch (e) {
          console.error("Erreur lors de la suppression du joueur:", e);
          setMessage("Erreur lors de la suppression du joueur. Veuillez réessayer.");
      } finally {
          setDeletingPlayer(false);
      }
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
            <div className="text-xl">Chargement des joueurs...</div>
        </div>
    );
  }

  return (
    <div className="bg-gray-950 text-white min-h-screen p-4 sm:p-8 font-sans overflow-x-hidden">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-orange-400 flex items-center">
                Gestion des utilisateurs
            </h1>
            <button
                onClick={() => setCurrentPage('MainApp')}
                className="px-4 py-2 bg-gray-700 text-white rounded-full shadow-lg hover:bg-gray-600 transition-colors duration-300 text-sm sm:text-base"
            >
                Retour
            </button>
        </header>
        <div className="bg-gray-900 rounded-2xl shadow-lg p-4 sm:p-6 mb-8 border border-orange-500 overflow-x-auto">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-orange-400">Liste des joueurs</h2>
            <table className="w-full text-left min-w-[700px]">
                <thead>
                    <tr className="bg-gray-800 text-xs sm:text-sm">
                        <th className="p-3 rounded-tl-xl">Nom</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">ID utilisateur</th>
                        <th className="p-3 rounded-tr-xl">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {players.map(player => (
                        <tr key={player.id} className="border-t border-gray-800 hover:bg-gray-800 transition-colors duration-200 text-sm">
                            <td className="p-3 font-bold">{player.name}</td>
                            <td className="p-3 text-xs sm:text-sm">{player.email}</td>
                            <td className="p-3 font-mono text-[10px] sm:text-xs break-all">{player.id}</td>
                            <td className="p-3">
                                <button
                                    onClick={() => handleOpenDeletePlayerConfirmation(player)}
                                    className="px-3 py-1 bg-red-600 text-white text-xs sm:text-sm rounded-full shadow-lg hover:bg-red-700 transition-colors"
                                >
                                    Supprimer
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {message && <p className="text-center mt-4 text-sm text-green-400">{message}</p>}
        </div>

        {/* Modal de confirmation de suppression */}
        {showDeleteConfirmation && playerToDelete && (
          <div className="fixed inset-0 bg-gray-950 bg-opacity-75 flex items-center justify-center p-4 z-50">
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
    </div>
  );
};


const MainApp = ({ user, handleLogout, playerName, setCurrentPage, isAdmin }) => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedExercise, setSelectedExercise] = useState(EXERCISES[0]);
  const [quantity, setQuantity] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showPlayerDetailsModal, setShowPlayerDetailsModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!db) {
      console.error("Firestore n'est pas initialisé.");
      setErrorMessage("La connexion à la base de données a échoué.");
      return;
    }

    setLoading(true);
    // Mise à jour de la référence de la collection pour un chemin unique et public
    const playersCollectionRef = collection(db, `artifacts/${appId}/public/data/team_challenge`);
    const unsubscribe = onSnapshot(playersCollectionRef, (snapshot) => {
      const playersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPlayers(playersData);
      setLoading(false);
      console.log("Données mises à jour depuis Firestore.");
    }, (error) => {
      console.error("Erreur lors de la récupération des données:", error);
      setErrorMessage("Erreur de connexion à la base de données. Veuillez réessayer.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, appId, user]);

  const handleAddTraining = async () => {
    if (!playerName || !quantity) {
      setMessage("Veuillez remplir le nom du joueur et la quantité.");
      return;
    }

    setLoading(true);
    setMessage('');
    const exerciseName = selectedExercise.name;
    const groupName = selectedExercise.group;
    const pointsEarned = (parseFloat(quantity) / selectedExercise.pointsPer) * selectedExercise.points;
    const today = new Date().toISOString().slice(0, 10);
    const currentWeek = getWeekNumber(new Date());

    try {
      // Utilisation de l'ID utilisateur comme identifiant de document
      const playerDocRef = doc(db, `artifacts/${appId}/public/data/team_challenge`, user.uid);
      const playerDoc = await getDoc(playerDocRef);
      const newTraining = {
        exercise: exerciseName,
        quantity: parseFloat(quantity),
        points: pointsEarned,
        date: today,
        group: groupName,
        emoji: selectedExercise.emoji,
        timestamp: Date.now()
      };

      if (playerDoc.exists()) {
        const data = playerDoc.data();
        const dailyPoints = { ...data.dailyPoints, [today]: (data.dailyPoints?.[today] || 0) + pointsEarned };
        const weeklyPoints = { ...data.weeklyPoints, [currentWeek]: (data.weeklyPoints?.[currentWeek] || 0) + pointsEarned };
        const groupPoints = { ...data.groupPoints };
        if (!groupPoints[currentWeek]) {
            groupPoints[currentWeek] = {};
        }
        groupPoints[currentWeek][groupName] = (groupPoints[currentWeek]?.[groupName] || 0) + pointsEarned;
        const allActivities = [...(data.allActivities || []), newTraining];
        await updateDoc(playerDocRef, { dailyPoints, weeklyPoints, allActivities, name: playerName, groupPoints });
        console.log("Document mis à jour pour le joueur :", playerName);
      } else {
        const newPlayer = {
          name: playerName,
          email: user.email,
          dailyPoints: { [today]: pointsEarned },
          weeklyPoints: { [currentWeek]: pointsEarned },
          groupPoints: { [currentWeek]: { [groupName]: pointsEarned } },
          allActivities: [newTraining],
        };
        await setDoc(playerDocRef, newPlayer);
        console.log("Nouveau document créé pour le joueur :", playerName);
      }
      setMessage("Entraînement ajouté avec succès !");
      setQuantity('');
      setShowModal(false);
    } catch (e) {
      console.error("Erreur lors de l'ajout de l'entraînement:", e);
      setMessage("Erreur lors de l'ajout. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteActivity = async () => {
    if (!selectedPlayer || !activityToDelete) return;
    setDeleting(true);
    setMessage('');
    try {
      const playerDocRef = doc(db, `artifacts/${appId}/public/data/team_challenge`, selectedPlayer.id);
      const data = selectedPlayer;
      const activity = activityToDelete;
      const pointsToSubtract = activity.points;
      const groupName = activity.group;
      const date = activity.date;
      const currentWeek = getWeekNumber(new Date(date));
      const updatedWeeklyPoints = { ...data.weeklyPoints, [currentWeek]: (data.weeklyPoints?.[currentWeek] || 0) - pointsToSubtract };
      const updatedGroupPoints = { ...data.groupPoints };
      if (updatedGroupPoints?.[currentWeek]?.[groupName]) {
        updatedGroupPoints[currentWeek][groupName] -= pointsToSubtract;
      }
      const updatedDailyPoints = { ...data.dailyPoints };
      if (updatedDailyPoints?.[date]) {
        updatedDailyPoints[date] -= pointsToSubtract;
        if (updatedDailyPoints[date] <= 0) {
          delete updatedDailyPoints[date];
        }
      }
      const updatedActivities = (data.allActivities || []).filter(a => a.timestamp !== activity.timestamp);
      await updateDoc(playerDocRef, { dailyPoints: updatedDailyPoints, weeklyPoints: updatedWeeklyPoints, groupPoints: updatedGroupPoints, allActivities: updatedActivities });
      setMessage(`Activité supprimée avec succès pour ${selectedPlayer.name}.`);
      setShowDeleteConfirmation(false);
      setActivityToDelete(null);
    } catch (e) {
      console.error("Erreur lors de la suppression de l'activité:", e);
      setMessage("Erreur lors de la suppression. Veuillez réessayer.");
    } finally {
      setDeleting(false);
    }
  };

  const getTotalWeeklyPoints = (player) => {
    const currentWeek = getWeekNumber(new Date());
    return player.weeklyPoints ? (player.weeklyPoints[currentWeek] || 0) : 0;
  };

  const getGroupPoints = (player, groupName) => {
    const currentWeek = getWeekNumber(new Date());
    return player.groupPoints?.[currentWeek]?.[groupName] || 0;
  };

  // Filtrer les joueurs pour exclure l'admin avant de les trier
  const sortedPlayers = players
    .filter(player => player.email !== ADMIN_EMAIL)
    .sort((a, b) => getTotalWeeklyPoints(b) - getTotalWeeklyPoints(a));

  const handleOpenModal = () => {
    setQuantity('');
    setMessage('');
    setShowModal(true);
  };

  const handleOpenPlayerDetails = (player) => {
    setSelectedPlayer(player);
    setShowPlayerDetailsModal(true);
  };

  const handleClosePlayerDetails = () => {
    setShowPlayerDetailsModal(false);
    setSelectedPlayer(null);
  };

  const handleOpenDeleteConfirmation = (activity) => {
    setActivityToDelete(activity);
    setShowDeleteConfirmation(true);
  };

  const handleCloseDeleteConfirmation = () => {
    setShowDeleteConfirmation(false);
    setActivityToDelete(null);
  };

  return (
    <div className="bg-gray-950 text-white min-h-screen p-4 sm:p-8 font-sans overflow-x-hidden">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-orange-400">Team Challenge</h1>
            <span className="text-2xl">🔥</span>
          </div>
          <div className="relative">
            <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="px-4 py-2 bg-gray-700 text-white rounded-full shadow-lg hover:bg-gray-600 transition-colors duration-300 text-sm sm:text-base"
            >
              Menu
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl z-10">
                {isAdmin && (
                  <button
                      onClick={() => {
                        setCurrentPage('UserManagement');
                        setIsMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 rounded-t-lg"
                  >
                    Gérer les utilisateurs
                  </button>
                )}
                <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 rounded-b-lg"
                >
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </header>

        <p className="text-gray-400 text-center mb-6">Bienvenue, <span className="font-bold text-orange-400">{playerName}</span> !</p>

        {errorMessage && (
          <div className="bg-red-800 text-white p-3 rounded-lg mb-4 text-center">
            {errorMessage}
          </div>
        )}

        <div className="bg-gray-900 rounded-2xl shadow-lg p-4 sm:p-6 mb-8 border border-orange-500">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-orange-400">Ajouter un entraînement</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="exercise" className="block text-sm font-medium text-gray-300">Exercice</label>
              <select
                  id="exercise"
                  value={selectedExercise.id}
                  onChange={(e) => setSelectedExercise(EXERCISES.find(ex => ex.id === parseInt(e.target.value)))}
                  className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-orange-500 focus:ring-orange-500"
              >
                {EXERCISES.map(ex => (
                  <option key={ex.id} value={ex.id}>
                    {ex.emoji} {ex.name} ({ex.points} pts / {ex.pointsPer} {ex.unit})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-300">Quantité ({selectedExercise.unit})</label>
              <input
                  type="number"
                  id="quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  placeholder="Ex: 30"
              />
            </div>
            <button
                onClick={handleAddTraining}
                disabled={loading}
                className="w-full py-2 px-4 bg-orange-600 text-white font-bold rounded-full shadow-lg hover:bg-orange-700 transition-colors duration-300 disabled:opacity-50"
            >
              {loading ? 'Ajout...' : 'Ajouter'}
            </button>
          </div>
          {message && <p className="mt-4 text-center text-sm text-green-400">{message}</p>}
        </div>

        <div className="bg-gray-900 rounded-2xl shadow-lg p-4 sm:p-6 mb-8 border border-orange-500">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-orange-400">Classement de la semaine</h2>
          <div className="space-y-4">
            {sortedPlayers.length > 0 ? sortedPlayers.map((player, index) => (
              <div
                key={player.id}
                className="flex items-center justify-between bg-gray-800 p-3 rounded-xl shadow-md cursor-pointer hover:bg-gray-700 transition-colors duration-200"
                onClick={() => handleOpenPlayerDetails(player)}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg font-bold text-orange-400 w-6 text-center">{index + 1}.</span>
                  <span className="font-semibold text-white">{player.name}</span>
                </div>
                <div className="flex items-center space-x-2 text-orange-400 font-bold">
                    <span>
                        {getTotalWeeklyPoints(player).toFixed(1)} / 200 pts
                    </span>
                  <span className="text-sm text-gray-400">
                    {getGroupPoints(player, 'Groupe Rouge').toFixed(1)} 🔴
                  </span>
                  <span className="text-sm text-gray-400">
                    {getGroupPoints(player, 'Groupe Bleu').toFixed(1)} 🔵
                  </span>
                  <span className="text-sm text-gray-400">
                    {getGroupPoints(player, 'Groupe Vert').toFixed(1)} 🟢
                  </span>
                </div>
              </div>
            )) : (
              <p className="text-center text-gray-500">Aucun joueur trouvé. Commencez par ajouter un entraînement.</p>
            )}
          </div>
        </div>
      </div>

      {/* Modal de détails du joueur */}
      {showPlayerDetailsModal && selectedPlayer && (
        <div className="fixed inset-0 bg-gray-950 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 p-6 rounded-2xl shadow-xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-orange-400">{selectedPlayer.name}</h3>
              <button onClick={handleClosePlayerDetails} className="text-gray-400 hover:text-white text-3xl">&times;</button>
            </div>

            <div className="space-y-4 mb-6">
              <ProgressBarGauge
                  points={getTotalWeeklyPoints(selectedPlayer)}
                  goal={200}
                  title="Points de la semaine"
                  showEmojis={true}
              />
              <div className="flex justify-between space-x-2">
                <ProgressBarGauge
                    points={getGroupPoints(selectedPlayer, 'Groupe Rouge')}
                    goal={100}
                    title="Groupe Rouge 🔴"
                />
                <ProgressBarGauge
                    points={getGroupPoints(selectedPlayer, 'Groupe Bleu')}
                    goal={100}
                    title="Groupe Bleu 🔵"
                />
                <ProgressBarGauge
                    points={getGroupPoints(selectedPlayer, 'Groupe Vert')}
                    goal={100}
                    title="Groupe Vert 🟢"
                />
              </div>
            </div>

            <h4 className="text-xl font-semibold mb-3 text-white">Activités récentes</h4>
            {selectedPlayer.allActivities && selectedPlayer.allActivities.length > 0 ? (
              <ul className="space-y-2">
                {selectedPlayer.allActivities.sort((a, b) => b.timestamp - a.timestamp).map((activity, index) => (
                  <li key={index} className="bg-gray-900 p-3 rounded-lg flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-orange-400">{activity.emoji} {activity.exercise}</span>
                      <p className="text-sm text-gray-400">{activity.quantity} {EXERCISES.find(ex => ex.name === activity.exercise)?.unit} - {activity.points.toFixed(1)} pts</p>
                      <p className="text-xs text-gray-500">{activity.date}</p>
                    </div>
                    {user && user.uid === selectedPlayer.id && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDeleteConfirmation(activity);
                            }}
                            className="text-red-500 hover:text-red-400 transition-colors"
                        >
                          &times;
                        </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-center">Aucune activité enregistrée.</p>
            )}
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression d'activité */}
      {showDeleteConfirmation && activityToDelete && (
        <div className="fixed inset-0 bg-gray-950 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-lg">
            <h3 className="text-2xl font-bold text-white mb-4">Confirmer la suppression de l'activité</h3>
            <p className="text-gray-300 mb-6">
              Êtes-vous sûr de vouloir supprimer l'activité <span className="font-bold text-orange-400">{activityToDelete.exercise}</span> du {activityToDelete.date} ?
            </p>
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
  );
};

// Page d'authentification
const AuthPage = ({ setIsLoggedIn, setUserId, setPlayerName }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let userCredential;
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Connexion réussie");
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const playerDocRef = doc(db, `artifacts/${appId}/public/data/team_challenge`, userCredential.user.uid);
        await setDoc(playerDocRef, {
            name: email.split('@')[0],
            email: email,
            dailyPoints: {},
            weeklyPoints: {},
            groupPoints: {},
            allActivities: [],
        });
        console.log("Compte créé avec succès");
      }
      setIsLoggedIn(true);
      setUserId(userCredential.user.uid);
      setPlayerName(email.split('@')[0]);
    } catch (err) {
      console.error("Erreur d'authentification:", err);
      setError("Erreur d'authentification. Veuillez vérifier vos identifiants ou réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white font-sans p-4">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl shadow-xl p-8 border border-orange-500">
        <h2 className="text-3xl font-bold text-center text-orange-400 mb-6">
          {isLogin ? 'Connexion' : 'Créer un compte'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-orange-500 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-orange-500 focus:ring-orange-500"
            />
          </div>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-orange-600 text-white font-bold rounded-full shadow-lg hover:bg-orange-700 transition-colors duration-300 disabled:opacity-50"
          >
            {loading ? (isLogin ? 'Connexion...' : 'Création...') : (isLogin ? 'Se connecter' : 'Créer le compte')}
          </button>
        </form>
        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-orange-400 hover:underline"
          >
            {isLogin ? "Pas de compte ? Créer un compte" : "Déjà un compte ? Se connecter"}
          </button>
        </div>
      </div>
    </div>
  );
};


export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [currentPage, setCurrentPage] = useState('MainApp'); // Ajout d'un état pour la gestion des pages
  const isAdmin = user && user.email === ADMIN_EMAIL;


  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setLoading(true);
      if (authUser) {
        setUser(authUser);
        setIsLoggedIn(true);

        // Récupérer le nom du joueur depuis la base de données après la connexion
        const playerDocRef = doc(db, `artifacts/${appId}/public/data/team_challenge`, authUser.uid);
        const playerDoc = await getDoc(playerDocRef);
        if (playerDoc.exists()) {
            setPlayerName(playerDoc.data().name);
        } else {
            console.warn("Nom du joueur non trouvé pour l'utilisateur connecté.");
            setPlayerName("Inconnu");
        }

      } else {
        setUser(null);
        setPlayerName("");
        setIsLoggedIn(false);
        setCurrentPage('MainApp');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // onAuthStateChanged va gérer la réinitialisation de l'état
    } catch (error) {
      console.error("Erreur de déconnexion:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
        <div className="text-xl">Chargement de l'authentification...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
      return <AuthPage setIsLoggedIn={setIsLoggedIn} setUserId={(uid) => { setUser({ uid }); }} setPlayerName={setPlayerName} />;
  }

  if (isAdmin && currentPage === 'UserManagement') {
      return <UserManagementPage user={user} setCurrentPage={setCurrentPage} />;
  }

  return (
    <MainApp user={user} handleLogout={handleLogout} playerName={playerName} setCurrentPage={setCurrentPage} isAdmin={isAdmin} />
  );
}
