import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';

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

const ProgressBarGauge = ({ points, goal, title }) => {
  const percentage = Math.min(100, (points / goal) * 100);
  const progressColor = getBackgroundColor(points, goal);

  return (
    <div className="w-full flex flex-col items-center p-2 bg-gray-800 rounded-lg shadow-inner">
      <div className="text-sm font-semibold text-gray-300 mb-1">{title}</div>
      <div className="relative w-full h-4 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${progressColor}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <div className="w-full flex justify-between mt-1 text-xs font-mono">
        <span className="text-gray-400">0</span>
        <span className="font-bold text-blue-300">
          {points.toFixed(1)} / {goal} pts
        </span>
        <span className="text-gray-400">{goal}</span>
      </div>
    </div>
  );
};

const getEmoji = (points) => {
  if (points >= 200) return '🎉';
  if (points >= 150) return '💪';
  if (points >= 100) return '👍';
  if (points >= 50) return '🏃‍♂️';
  return '';
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
                className="px-4 py-2 bg-gray-700 text-white rounded-full shadow-lg hover:bg-gray-600 transition-colors duration-300"
            >
                Retour
            </button>
        </header>
        <div className="bg-gray-900 rounded-2xl shadow-lg p-4 sm:p-6 mb-8 border border-orange-500 overflow-x-auto">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-orange-400">Liste des joueurs</h2>
            <table className="w-full text-left min-w-[700px]">
                <thead>
                    <tr className="bg-gray-800">
                        <th className="p-3 rounded-tl-xl">Nom</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">ID utilisateur</th>
                        <th className="p-3 rounded-tr-xl">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {players.map(player => (
                        <tr key={player.id} className="border-t border-gray-800 hover:bg-gray-800 transition-colors duration-200">
                            <td className="p-3 font-bold">{player.name}</td>
                            <td className="p-3">{player.email}</td>
                            <td className="p-3 font-mono text-sm break-all">{player.id}</td>
                            <td className="p-3">
                                <button
                                    onClick={() => handleOpenDeletePlayerConfirmation(player)}
                                    className="px-4 py-2 bg-red-600 text-white text-sm rounded-full shadow-lg hover:bg-red-700 transition-colors"
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


const MainApp = ({ user, handleLogout, playerName, setCurrentPage }) => {
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

      await updateDoc(playerDocRef, {
        dailyPoints: updatedDailyPoints,
        weeklyPoints: updatedWeeklyPoints,
        groupPoints: updatedGroupPoints,
        allActivities: updatedActivities
      });

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

  const sortedPlayers = [...players].sort((a, b) => getTotalWeeklyPoints(b) - getTotalWeeklyPoints(a));

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
      setActivityToDelete(null);
      setShowDeleteConfirmation(false);
  };

  if (loading && !errorMessage) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
        <div className="text-xl">Chargement...</div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white p-4 text-center">
        <div className="bg-gray-900 rounded-lg p-8">
          <p className="text-xl text-red-400 font-bold mb-4">Erreur</p>
          <p className="text-gray-300">{errorMessage}</p>
        </div>
      </div>
    );
  }

  const activitiesByDay = selectedPlayer ? selectedPlayer.allActivities.reduce((acc, activity) => {
    const { date, ...rest } = activity;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(rest);
    return acc;
  }, {}) : {};

  const sortedDays = Object.keys(activitiesByDay).sort((a,b) => new Date(b) - new Date(a));

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <div className="bg-gray-950 text-white min-h-screen p-4 sm:p-8 font-sans overflow-x-hidden">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-6 relative">
            <h1 className="text-3xl sm:text-4xl font-bold text-orange-400 flex items-center">
                <img
                    src="https://static.wixstatic.com/media/613e2c_49bfb0765aa44b0b8211af156607e247~mv2.png/v1/fill/w_77,h_77,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/613e2c_49bfb0765aa44b0b8211af156607e247~mv2.png"
                    alt="Logo du club"
                    className="w-12 h-12 rounded-full mr-4"
                />
                Classement
            </h1>
            
            {/* Menu burger */}
            <div className="relative">
                <button
                    onClick={toggleMenu}
                    className="px-4 py-2 bg-gray-700 text-white rounded-full shadow-lg hover:bg-gray-600 transition-colors duration-300"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                </button>
                {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 z-10">
                        <div className="py-1">
                            <span className="block px-4 py-2 text-sm text-gray-300 border-b border-gray-700">
                                {playerName}
                            </span>
                            {/* Option de menu conditionnelle pour l'administrateur */}
                            {user.email === ADMIN_EMAIL && (
                                <button
                                    onClick={() => { setCurrentPage('UserManagement'); toggleMenu(); }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                                >
                                    Gestion des utilisateurs
                                </button>
                            )}
                            <button
                                onClick={() => { handleLogout(); toggleMenu(); }}
                                className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
                            >
                                Déconnexion
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </header>
        <p className="text-center mb-8 text-gray-400">
          *Note: Votre ID d'utilisateur est <span className="font-mono text-sm break-all">{user.uid}</span>
        </p>

        <div className="bg-gray-900 rounded-2xl shadow-lg p-4 sm:p-6 mb-8 border border-orange-500 overflow-x-auto">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-orange-400">Classement de l'équipe (semaine en cours)</h2>
          <div className="w-full">
            <table className="w-full text-left min-w-[700px]">
              <thead>
                <tr className="bg-gray-800">
                  <th className="p-3 rounded-tl-xl">Rang</th>
                  <th className="p-3">Joueur</th>
                  <th className="p-3">Points Totaux</th>
                  <th className="p-3">Groupe Rouge</th>
                  <th className="p-3">Groupe Bleu</th>
                  <th className="p-3 rounded-tr-xl">Groupe Vert</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.length > 0 ? (
                  sortedPlayers.map((player, index) => (
                    <tr key={player.id} className="border-t border-gray-800 hover:bg-gray-800 transition-colors duration-200">
                      <td className="p-3">{index + 1}</td>
                      <td className="p-3 flex items-center space-x-2">
                        {index === 0 && <span role="img" aria-label="gold trophy">🥇</span>}
                        {index === 1 && <span role="img" aria-label="silver trophy">🥈</span>}
                        {index === 2 && <span role="img" aria-label="bronze trophy">🥉</span>}
                        <span onClick={() => handleOpenPlayerDetails(player)} className="font-bold cursor-pointer hover:underline text-blue-300">
                          {player.name}
                        </span>
                      </td>
                      <td className="p-3">
                          <span className="font-bold text-lg">{getTotalWeeklyPoints(player).toFixed(1)} {getEmoji(getTotalWeeklyPoints(player))}</span>
                          <div className="w-full bg-gray-700 rounded-full h-2.5 mt-1">
                            <div
                              className={`h-2.5 rounded-full transition-all duration-500 ${getBackgroundColor(getTotalWeeklyPoints(player), 200)}`}
                              style={{ width: `${Math.min(100, (getTotalWeeklyPoints(player) / 200) * 100)}%` }}
                            ></div>
                          </div>
                      </td>
                      <td className="p-3">
                          <span className="font-bold text-sm">{getGroupPoints(player, 'Groupe Rouge').toFixed(1)}</span>
                          <div className="w-full bg-gray-700 rounded-full h-2.5 mt-1">
                            <div
                              className={`h-2.5 rounded-full transition-all duration-500 ${getBackgroundColor(getGroupPoints(player, 'Groupe Rouge'), 50)}`}
                              style={{ width: `${Math.min(100, (getGroupPoints(player, 'Groupe Rouge') / 50) * 100)}%` }}
                            ></div>
                          </div>
                      </td>
                      <td className="p-3">
                          <span className="font-bold text-sm">{getGroupPoints(player, 'Groupe Bleu').toFixed(1)}</span>
                          <div className="w-full bg-gray-700 rounded-full h-2.5 mt-1">
                            <div
                              className={`h-2.5 rounded-full transition-all duration-500 ${getBackgroundColor(getGroupPoints(player, 'Groupe Bleu'), 50)}`}
                              style={{ width: `${Math.min(100, (getGroupPoints(player, 'Groupe Bleu') / 50) * 100)}%` }}
                            ></div>
                          </div>
                      </td>
                      <td className="p-3">
                          <span className="font-bold text-sm">{getGroupPoints(player, 'Groupe Vert').toFixed(1)}</span>
                          <div className="w-full bg-gray-700 rounded-full h-2.5 mt-1">
                            <div
                              className={`h-2.5 rounded-full transition-all duration-500 ${getBackgroundColor(getGroupPoints(player, 'Groupe Vert'), 50)}`}
                              style={{ width: `${Math.min(100, (getGroupPoints(player, 'Groupe Vert') / 50) * 100)}%` }}
                            ></div>
                          </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="p-3 text-center text-gray-500">Aucun joueur pour le moment. Soyez le premier à vous entraîner !</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Légende des groupes d'activités, déplacée après le classement */}
        <div className="bg-gray-900 rounded-2xl shadow-lg p-4 sm:p-6 mb-8 border border-gray-700">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-white">Groupes d'activités</h2>
            <div className="flex flex-wrap gap-4 text-sm sm:text-base">
                <div className="flex items-center space-x-2">
                    <span className="w-4 h-4 rounded-full bg-red-500"></span>
                    <span className="text-red-300">Groupe Rouge (Renforcement & sports collectifs)</span>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="w-4 h-4 rounded-full bg-blue-500"></span>
                    <span className="text-blue-300">Groupe Bleu (Activités nautiques & sports d'eau)</span>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="w-4 h-4 rounded-full bg-green-500"></span>
                    <span className="text-green-300">Groupe Vert (Endurance & cardio)</span>
                </div>
            </div>
        </div>

        <div className="text-center">
          <button
            onClick={handleOpenModal}
            className="px-6 py-3 bg-orange-500 text-white font-bold rounded-full shadow-lg hover:bg-orange-600 transition-colors duration-300 transform hover:scale-105"
          >
            Ajouter un entraînement
          </button>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-gray-950 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-orange-500 shadow-xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-semibold mb-4 text-orange-400">Ajouter un entraînement</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="player-name-input" className="block text-gray-300">Votre nom :</label>
                  <input
                    id="player-name-input"
                    type="text"
                    value={playerName}
                    disabled={true} // Le nom est maintenant lié à l'inscription et ne peut pas être modifié ici
                    className="w-full p-2 mt-1 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-orange-500 disabled:opacity-50"
                    placeholder="Entrez votre nom"
                  />
                </div>
                <div>
                  <label htmlFor="exercise-select" className="block text-gray-300">Activité :</label>
                  <select
                    id="exercise-select"
                    value={selectedExercise.name}
                    onChange={(e) => setSelectedExercise(EXERCISES.find(ex => ex.name === e.target.value))}
                    className="w-full p-2 mt-1 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-orange-500"
                  >
                    {EXERCISES.map((ex) => (
                      <option key={ex.id} value={ex.name}>{ex.emoji} {ex.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="quantity-input" className="block text-gray-300">
                    Quantité ({selectedExercise.unit}) :
                  </label>
                  <input
                    id="quantity-input"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full p-2 mt-1 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="text-center text-gray-400">
                  Points estimés : <span className="font-bold text-orange-400">
                    {quantity ? ((parseFloat(quantity) / selectedExercise.pointsPer) * selectedExercise.points).toFixed(1) : '0'}
                  </span>
                </div>
                {message && <p className="text-sm text-center text-red-400">{message}</p>}
                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition-colors duration-200"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleAddTraining}
                    disabled={loading}
                    className="px-4 py-2 bg-orange-500 text-white font-bold rounded-full hover:bg-orange-600 transition-colors duration-200 disabled:opacity-50"
                  >
                    {loading ? 'Envoi...' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de synthèse du joueur */}
        {showPlayerDetailsModal && selectedPlayer && (
          <div className="fixed inset-0 bg-gray-950 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-2xl border border-orange-500 shadow-xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-semibold mb-4 text-orange-400">Synthèse des entraînements de {selectedPlayer.name}</h3>
              <div className="mb-6">
                <ProgressBarGauge
                  points={getTotalWeeklyPoints(selectedPlayer)}
                  goal={200}
                  title={`Objectif hebdomadaire: 200 points`}
                />
              </div>
              {Object.keys(activitiesByDay).length > 0 ? (
                Object.keys(activitiesByDay).sort((a,b) => new Date(b) - new Date(a)).map(day => (
                  <div key={day} className="mb-6 p-4 bg-gray-800 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-xl font-bold text-blue-300">Journée du {day}</h4>
                    </div>
                    <ul className="space-y-2">
                      {activitiesByDay[day].map((activity) => (
                        <li key={activity.timestamp} className="bg-gray-700 p-3 rounded-md flex justify-between items-center">
                          <span>
                            <span className="font-semibold">{activity.emoji} {activity.exercise}</span> : {activity.quantity} {activity.unit}
                          </span>
                          <span className="flex items-center space-x-2">
                            <span className="font-bold text-blue-300">{activity.points.toFixed(1)} points</span>
                            {/* Seul l'administrateur peut supprimer une activité */}
                            {user.email === ADMIN_EMAIL && (
                                <button
                                    onClick={() => handleOpenDeleteConfirmation(activity)}
                                    className="text-white bg-red-500 hover:bg-red-600 p-1 rounded-full transition-colors duration-200"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 112 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <p className="text-gray-400">Aucun entraînement enregistré pour ce joueur.</p>
              )}
              <div className="text-right mt-6">
                <button
                  onClick={handleClosePlayerDetails}
                  className="px-6 py-3 bg-orange-500 text-white font-bold rounded-full hover:bg-orange-600 transition-colors duration-300"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmation de suppression */}
        {showDeleteConfirmation && (
            <div className="fixed inset-0 bg-gray-950 bg-opacity-75 flex items-center justify-center p-4 z-50">
                <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-red-500 shadow-xl">
                    <h3 className="text-xl font-semibold mb-4 text-red-400">Confirmer la suppression</h3>
                    <p className="text-gray-300 mb-4">
                        Êtes-vous sûr de vouloir supprimer l'activité <span className="font-bold">{activityToDelete.exercise}</span> du <span className="font-bold">{activityToDelete.date}</span> pour <span className="font-bold">{selectedPlayer.name}</span> ? Cette action est irréversible.
                    </p>
                    {message && <p className="text-sm text-center text-red-400 mb-4">{message}</p>}
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

const AuthPage = ({ setIsLoggedIn, setUserId, setPlayerName }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [playerNameInput, setPlayerNameInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      if (isRegistering) {
        // Inscription
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        const playerDocRef = doc(db, `artifacts/${appId}/public/data/team_challenge`, user.uid);
        const newPlayer = {
            name: playerNameInput,
            email: user.email,
            dailyPoints: {},
            weeklyPoints: {},
            groupPoints: {},
            allActivities: [],
            lastLogin: new Date().toISOString()
        };
        await setDoc(playerDocRef, newPlayer);

        setUserId(user.uid);
        setPlayerName(playerNameInput);
        setIsLoggedIn(true);
      } else {
        // Connexion
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Récupérer le nom du joueur depuis la base de données après la connexion
        const playerDocRef = doc(db, `artifacts/${appId}/public/data/team_challenge`, user.uid);
        const playerDoc = await getDoc(playerDocRef);
        if (playerDoc.exists()) {
            setPlayerName(playerDoc.data().name);
        } else {
            console.warn("Nom du joueur non trouvé pour l'utilisateur connecté.");
            setPlayerName("Inconnu");
        }
        
        setUserId(user.uid);
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.error("Erreur d'authentification:", error);
      let message = "Erreur d'authentification. Veuillez réessayer.";
      if (error.code === 'auth/email-already-in-use') {
        message = "Cette adresse e-mail est déjà utilisée.";
      } else if (error.code === 'auth/invalid-email') {
        message = "L'adresse e-mail n'est pas valide.";
      } else if (error.code === 'auth/weak-password') {
        message = "Le mot de passe doit contenir au moins 6 caractères.";
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        message = "Identifiants incorrects.";
      }
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white font-sans p-4">
      <div className="bg-gray-900 rounded-2xl shadow-xl p-8 w-full max-w-sm border border-orange-500">
        <h1 className="text-2xl font-bold text-center mb-6 text-orange-400">
          {isRegistering ? 'Inscription' : 'Connexion'}
        </h1>
        <div className="space-y-4">
          {isRegistering && (
            <div>
              <input
                type="text"
                value={playerNameInput}
                onChange={(e) => setPlayerNameInput(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-orange-500"
                placeholder="Votre nom de joueur"
              />
            </div>
          )}
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-orange-500"
              placeholder="Adresse e-mail"
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-orange-500"
              placeholder="Mot de passe"
            />
          </div>
          {errorMessage && <p className="text-sm text-center text-red-400">{errorMessage}</p>}
          <button
            onClick={handleAuth}
            disabled={loading}
            className="w-full px-4 py-3 bg-orange-500 text-white font-bold rounded-full hover:bg-orange-600 transition-colors duration-300 disabled:opacity-50"
          >
            {loading ? 'Chargement...' : (isRegistering ? 'S\'inscrire' : 'Se connecter')}
          </button>
        </div>
        <div className="mt-4 text-center">
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-orange-400 text-sm hover:underline"
          >
            {isRegistering ? 'Vous avez déjà un compte ? Connectez-vous.' : 'Vous n\'avez pas de compte ? Inscrivez-vous.'}
          </button>
        </div>
      </div>
    </div>
  );
};


const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playerName, setPlayerName] = useState("");
  const [currentPage, setCurrentPage] = useState('MainApp');

  useEffect(() => {
    if (!auth) {
      console.error("Auth n'est pas initialisé.");
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
        setIsLoggedIn(true);

        // Récupérer le nom du joueur lors de la connexion
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

  if (currentPage === 'UserManagement') {
      return <UserManagementPage user={user} setCurrentPage={setCurrentPage} />;
  }

  return (
    <MainApp user={user} handleLogout={handleLogout} playerName={playerName} setCurrentPage={setCurrentPage} />
  );
};

export default App;
