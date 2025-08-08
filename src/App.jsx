import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';

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
  { name: 'Abdominaux', points: 2, unit: 'série de 10', pointsPer: 1, group: 'Groupe 3' },
  { name: 'Course à pied (Sur piste)', points: 5, unit: 'Km', pointsPer: 1, group: 'Groupe 1' },
  { name: 'Course à pied (En forêt)', points: 7, unit: 'Km', pointsPer: 1, group: 'Groupe 1' },
  { name: 'Course à pied (Sur la plage)', points: 10, unit: 'Km', pointsPer: 1, group: 'Groupe 1' },
  { name: 'Natation (Piscine)', points: 1, unit: 'longueur (25m)', pointsPer: 1, group: 'Groupe 1' },
  { name: 'Natation (Mer)', points: 5, unit: 'minutes', pointsPer: 5, group: 'Groupe 1' },
  { name: 'Vélo (Elliptique/Appartement)', points: 4, unit: 'Km', pointsPer: 1, group: 'Groupe 1' },
  { name: 'Vélo (Sur route)', points: 5, unit: 'Km', pointsPer: 1, group: 'Groupe 1' },
  { name: 'Vélo (VTT)', points: 7, unit: 'Km', pointsPer: 1, group: 'Groupe 1' },
  { name: 'Basket (Salle/Extérieur)', points: 10, unit: 'minutes', pointsPer: 30, group: 'Groupe 2' },
  { name: 'Sport de raquettes', points: 10, unit: 'minutes', pointsPer: 30, group: 'Groupe 2' },
  { name: 'Autres sports', points: 10, unit: 'minutes', pointsPer: 30, group: 'Autres' }, // 'Autres' pour les sports qui ne rentrent pas dans les 3 groupes
  { name: 'Corde à sauter', points: 3, unit: 'minutes', pointsPer: 1, group: 'Autres' },
  { name: 'Sport nautique (Canoë, Kayak, Ski nautique)', points: 10, unit: 'minutes', pointsPer: 30, group: 'Autres' },
];

const getWeekNumber = (d) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return weekNo;
};

// Fonction pour déterminer la couleur de la barre de progression en fonction des points
const getBackgroundColor = (points, goal) => {
  const percentage = (points / goal) * 100;
  if (percentage >= 100) return 'bg-orange-500'; // Couleur de succès changée en orange
  if (percentage >= 50) return 'bg-blue-500';    // Couleur intermédiaire changée en bleu
  return 'bg-red-500';
};

const App = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null); 
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(EXERCISES[0]);
  const [quantity, setQuantity] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Nouveaux états pour la fonctionnalité de synthèse des joueurs
  const [showPlayerDetailsModal, setShowPlayerDetailsModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Nouveaux états pour la réinitialisation des entraînements
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Initialisation de l'authentification et écoute des changements
  useEffect(() => {
    if (!auth) {
      console.error("Auth n'est pas initialisé.");
      setErrorMessage("La connexion à la base de données a échoué. Veuillez vérifier la configuration.");
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
            console.log("Authentification avec token personnalisée réussie.");
          } else {
            await signInAnonymously(auth);
            console.log("Authentification anonyme réussie.");
          }
        }
        if (auth.currentUser) {
          setUserId(auth.currentUser.uid);
        }
        setIsAuthReady(true);
      } catch (error) {
        console.error("Erreur d'authentification:", error);
        setErrorMessage("Erreur d'authentification. Veuillez réessayer.");
        setIsAuthReady(true); // Permet de passer le chargement même en cas d'erreur d'auth
      }
    });
    return () => unsubscribe();
  }, [auth, initialAuthToken]);

  // Écoute des données de Firestore en temps réel
  useEffect(() => {
    if (!db || !isAuthReady || errorMessage) {
      console.log("Firestore non prêt, ne pas écouter les données.");
      return;
    }
    
    setLoading(true);
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
  }, [isAuthReady, db, appId, errorMessage]);

  // Fonction pour ajouter un entraînement
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
      const playerDocRef = doc(db, `artifacts/${appId}/public/data/team_challenge`, playerName.toLowerCase());
      const playerDoc = await getDoc(playerDocRef);
      // Ajout d'un timestamp pour avoir un identifiant unique par activité
      const newTraining = { 
        exercise: exerciseName, 
        quantity: parseFloat(quantity), 
        points: pointsEarned, 
        date: today, 
        group: groupName,
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

      // Calcul des points à soustraire
      const pointsToSubtract = activity.points;
      const groupName = activity.group;
      const date = activity.date;
      const currentWeek = getWeekNumber(new Date(date));

      // Mise à jour des points
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
    setPlayerName('');
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
  
  // Fonction pour obtenir l'emoji basé sur le total de points
  const getEmoji = (points) => {
    if (points >= 200) return '🎉';
    if (points >= 150) return '💪';
    if (points >= 100) return '👍';
    if (points >= 50) return '🏃‍♂️';
    return '';
  };
  
  const sortedDays = Object.keys(activitiesByDay).sort((a,b) => new Date(b) - new Date(a));

  // Composant de jauge de progression
  const ProgressBarGauge = ({ points, goal, title }) => {
    const percentage = Math.min(100, (points / goal) * 100);
    const progressColor = getBackgroundColor(points, goal);
    const isCompleted = points >= goal;

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


  return (
    <div className="bg-gray-950 text-white min-h-screen p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-6 text-orange-400 flex items-center justify-center">
          <img 
            src="https://static.wixstatic.com/media/613e2c_49bfb0765aa44b0b8211af156607e247~mv2.png/v1/fill/w_77,h_77,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/613e2c_49bfb0765aa44b0b8211af156607e247~mv2.png" 
            alt="Logo du club" 
            className="w-12 h-12 rounded-full mr-4"
          />
          Training summer 2025
        </h1>
        <p className="text-center mb-8 text-gray-400">
          *Note: L'ID de session est <span className="font-mono text-sm break-all">{userId}</span>
        </p>
        <div className="bg-gray-900 rounded-2xl shadow-lg p-4 sm:p-6 mb-8 border border-orange-500">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-orange-400">Classement de l'équipe (semaine en cours)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-800">
                  <th className="p-3 rounded-tl-xl">Rang</th>
                  <th className="p-3">Joueur</th>
                  <th className="p-3">Points Totaux</th>
                  <th className="p-3">Course/Vélo/Natation</th>
                  <th className="p-3">Sports collectifs</th>
                  <th className="p-3 rounded-tr-xl">Gainage/Étirements/Abdos</th>
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
                          <span className="font-bold text-sm">{getGroupPoints(player, 'Groupe 1').toFixed(1)}</span>
                          <div className="w-full bg-gray-700 rounded-full h-2.5 mt-1">
                            <div
                              className={`h-2.5 rounded-full transition-all duration-500 ${getBackgroundColor(getGroupPoints(player, 'Groupe 1'), 50)}`}
                              style={{ width: `${Math.min(100, (getGroupPoints(player, 'Groupe 1') / 50) * 100)}%` }}
                            ></div>
                          </div>
                      </td>
                      <td className="p-3">
                          <span className="font-bold text-sm">{getGroupPoints(player, 'Groupe 2').toFixed(1)}</span>
                          <div className="w-full bg-gray-700 rounded-full h-2.5 mt-1">
                            <div
                              className={`h-2.5 rounded-full transition-all duration-500 ${getBackgroundColor(getGroupPoints(player, 'Groupe 2'), 50)}`}
                              style={{ width: `${Math.min(100, (getGroupPoints(player, 'Groupe 2') / 50) * 100)}%` }}
                            ></div>
                          </div>
                      </td>
                      <td className="p-3">
                          <span className="font-bold text-sm">{getGroupPoints(player, 'Groupe 3').toFixed(1)}</span>
                          <div className="w-full bg-gray-700 rounded-full h-2.5 mt-1">
                            <div
                              className={`h-2.5 rounded-full transition-all duration-500 ${getBackgroundColor(getGroupPoints(player, 'Groupe 3'), 50)}`}
                              style={{ width: `${Math.min(100, (getGroupPoints(player, 'Groupe 3') / 50) * 100)}%` }}
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
            <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-orange-500 shadow-xl">
              <h3 className="text-2xl font-semibold mb-4 text-orange-400">Ajouter un entraînement</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="player-name-input" className="block text-gray-300">Votre nom :</label>
                  <input
                    id="player-name-input"
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full p-2 mt-1 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-orange-500"
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
                      <option key={ex.name} value={ex.name}>{ex.name}</option>
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
              
              {/* Jauge de progression des points hebdomadaires */}
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
                            <span className="font-semibold">{activity.exercise}</span> : {activity.quantity} {activity.unit}
                          </span>
                          <span className="flex items-center space-x-2">
                            <span className="font-bold text-blue-300">{activity.points.toFixed(1)} points</span>
                            <button
                              onClick={() => handleOpenDeleteConfirmation(activity)}
                              className="text-white bg-red-500 hover:bg-red-600 p-1 rounded-full transition-colors duration-200"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 112 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                              </svg>
                            </button>
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

export default App;
