import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, updateDoc, getDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { HiMenu, HiX } from "react-icons/hi"; // Icônes pour le menu
import { FaStar } from "react-icons/fa";
import { RiDashboardLine, RiTeamLine } from 'react-icons/ri';
import { LuLogOut } from "react-icons/lu";
import { CgPlayListAdd } from "react-icons/cg";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Initialisation de Firebase avec les configurations fournies par l'environnement
// J'ai corrigé l'erreur et j'ai réintégré votre configuration Firebase ici
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
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
  { name: 'Étirements', points: 5, unit: 'minutes', pointsPer: 10, group: 'Endurance' },
  { name: 'Saut à la corde', points: 10, unit: 'minutes', pointsPer: 10, group: 'Cardio' },
  { name: 'Course', points: 15, unit: 'minutes', pointsPer: 10, group: 'Cardio' },
  { name: 'Pompes', points: 15, unit: 'répétitions', pointsPer: 10, group: 'Force' },
  { name: 'Planche', points: 10, unit: 'secondes', pointsPer: 10, group: 'Force' },
  { name: 'Squats', points: 10, unit: 'répétitions', pointsPer: 10, group: 'Force' },
  { name: 'Vélo', points: 12, unit: 'minutes', pointsPer: 10, group: 'Endurance' },
  { name: 'Gainage', points: 10, unit: 'minutes', pointsPer: 10, group: 'Force' },
  { name: 'Flexions', points: 8, unit: 'répétitions', pointsPer: 10, group: 'Force' },
  { name: 'Fentes', points: 12, unit: 'répétitions', pointsPer: 10, group: 'Force' },
];

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState('accueil');
  const [players, setPlayers] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [message, setMessage] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [activityInput, setActivityInput] = useState({
    exercise: '',
    value: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Établir l'authentification et la connexion à Firebase
  useEffect(() => {
    if (!isFirebaseConnected) {
      setIsAuthReady(true);
      return;
    }

    const signInAndListen = async () => {
      try {
        if (initialAuthToken) {
          await signInWithCustomToken(auth, initialAuthToken);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Erreur d'authentification Firebase:", error);
      }

      onAuthStateChanged(auth, (user) => {
        if (user) {
          setIsAuthenticated(true);
          setUserId(user.uid);
          console.log("Utilisateur connecté:", user.uid);
        } else {
          setIsAuthenticated(false);
          setUserId(null);
          console.log("Utilisateur déconnecté.");
        }
        setIsAuthReady(true);
      });
    };

    signInAndListen();
  }, [auth, initialAuthToken]);

  // Écouter les données des joueurs une fois l'authentification prête
  useEffect(() => {
    if (!isAuthReady || !isAuthenticated || !db || !userId) {
      return;
    }

    const playersRef = collection(db, `artifacts/${appId}/users/${userId}/players`);
    const unsubscribe = onSnapshot(playersRef, (snapshot) => {
      const playersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPlayers(playersData);
      console.log("Données des joueurs mises à jour.");
    }, (error) => {
      console.error("Erreur lors de la récupération des joueurs:", error);
      setMessage(`Erreur: Impossible de récupérer les joueurs. ${error.message}`);
    });

    return () => unsubscribe();
  }, [isAuthReady, isAuthenticated, db, userId]);

  // Fonction pour ajouter un joueur
  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!isAuthReady || !isAuthenticated) {
      setMessage("Erreur: Vous n'êtes pas authentifié pour effectuer cette action.");
      return;
    }
    if (!newPlayerName.trim()) {
      setMessage("Le nom du joueur ne peut pas être vide.");
      return;
    }

    try {
      const playersRef = collection(db, `artifacts/${appId}/users/${userId}/players`);
      await addDoc(playersRef, {
        name: newPlayerName.trim(),
        points: 0,
        activities: []
      });
      setNewPlayerName('');
      setMessage('');
    } catch (error) {
      console.error("Erreur lors de l'ajout du joueur:", error);
      setMessage(`Erreur: Impossible d'ajouter le joueur. ${error.message}`);
    }
  };

  const handleSelectPlayer = (player) => {
    setSelectedPlayer(player);
    setView('player-detail');
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    if (!selectedPlayer) return;
    if (!activityInput.exercise || !activityInput.value || !activityInput.date) {
      setMessage("Veuillez remplir tous les champs de l'activité.");
      return;
    }

    const exercise = EXERCISES.find(ex => ex.name === activityInput.exercise);
    if (!exercise) {
      setMessage("Exercice non trouvé.");
      return;
    }

    const points = Math.floor((activityInput.value / exercise.pointsPer) * exercise.points);
    const newActivity = {
      ...activityInput,
      points: points,
      timestamp: new Date(activityInput.date).getTime()
    };

    try {
      const playerDocRef = doc(db, `artifacts/${appId}/users/${userId}/players`, selectedPlayer.id);
      const playerDoc = await getDoc(playerDocRef);
      if (playerDoc.exists()) {
        const playerData = playerDoc.data();
        const updatedActivities = [...(playerData.activities || []), newActivity];
        const totalPoints = updatedActivities.reduce((sum, act) => sum + act.points, 0);

        await updateDoc(playerDocRef, {
          activities: updatedActivities,
          points: totalPoints,
        });

        setActivityInput({
          exercise: '',
          value: '',
          date: format(new Date(), 'yyyy-MM-dd')
        });
        setMessage('');
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'activité:", error);
      setMessage(`Erreur: Impossible d'ajouter l'activité. ${error.message}`);
    }
  };

  const handleLogout = async () => {
    try {
      if (auth) {
        await signOut(auth);
        console.log("Déconnexion réussie.");
        setMessage("Vous avez été déconnecté.");
      }
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      setMessage(`Erreur de déconnexion: ${error.message}`);
    }
  };

  const confirmDeleteActivity = (activity) => {
    setActivityToDelete(activity);
    setShowDeleteConfirmation(true);
  };

  const handleCloseDeleteConfirmation = () => {
    setShowDeleteConfirmation(false);
    setActivityToDelete(null);
  };

  const handleDeleteActivity = async () => {
    if (!selectedPlayer || !activityToDelete) return;
    setDeleting(true);
    try {
      const playerDocRef = doc(db, `artifacts/${appId}/users/${userId}/players`, selectedPlayer.id);
      const playerDoc = await getDoc(playerDocRef);

      if (playerDoc.exists()) {
        const playerData = playerDoc.data();
        const updatedActivities = playerData.activities.filter(
          act => act.date !== activityToDelete.date || act.exercise !== activityToDelete.exercise
        );
        const totalPoints = updatedActivities.reduce((sum, act) => sum + act.points, 0);

        await updateDoc(playerDocRef, {
          activities: updatedActivities,
          points: totalPoints,
        });

        handleCloseDeleteConfirmation();
        setMessage('Activité supprimée avec succès !');
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de l'activité:", error);
      setMessage(`Erreur: Impossible de supprimer l'activité. ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const renderView = () => {
    switch (view) {
      case 'accueil':
        const sortedPlayers = [...players].sort((a, b) => b.points - a.points);
        return (
          <div className="p-4 sm:p-6 md:p-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-white mb-6">
              Classement des joueurs
            </h2>
            {sortedPlayers.length === 0 ? (
              <p className="text-center text-gray-400">Aucun joueur n'est encore enregistré.</p>
            ) : (
              <div className="space-y-4">
                {sortedPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className="bg-gray-800 p-4 rounded-xl shadow-lg flex items-center justify-between cursor-pointer hover:bg-gray-700 transition-colors"
                    onClick={() => handleSelectPlayer(player)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="text-orange-400 font-bold text-xl w-8 text-center">{index + 1}</div>
                      <div className="font-bold text-lg text-white">{player.name}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-semibold text-orange-400">{player.points}</span>
                      <FaStar className="text-yellow-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'gerer-joueurs':
        return (
          <div className="p-4 sm:p-6 md:p-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-white mb-6">
              Gérer les joueurs
            </h2>
            {players.length === 0 ? (
              <p className="text-center text-gray-400">Aucun joueur n'est encore enregistré.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {players.map((player) => (
                  <div
                    key={player.id}
                    onClick={() => handleSelectPlayer(player)}
                    className="relative bg-gray-800 p-6 rounded-xl shadow-lg cursor-pointer hover:bg-gray-700 transition-colors group"
                  >
                    <h3 className="text-xl font-bold text-white mb-2">{player.name}</h3>
                    <div className="flex items-center text-orange-400 font-bold">
                      <FaStar className="mr-2" />
                      <span>{player.points} points</span>
                    </div>
                    <div className="absolute top-4 right-4 text-gray-500 group-hover:text-white transition-colors">
                      <CgPlayListAdd size={24} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'player-detail':
        return (
          <div className="p-4 sm:p-6 md:p-8 text-white">
            <button
              onClick={() => setView('gerer-joueurs')}
              className="px-4 py-2 mb-6 bg-gray-700 text-white rounded-full shadow-lg hover:bg-gray-600 transition-colors flex items-center"
            >
              <span className="mr-2">&larr;</span> Retour
            </button>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-center text-orange-400">
              {selectedPlayer.name}
            </h2>
            <div className="text-center mb-6 text-xl font-bold flex items-center justify-center">
              <span className="mr-2">Total des points:</span>
              <span className="text-orange-400">{selectedPlayer.points}</span>
              <FaStar className="text-yellow-400 ml-2" />
            </div>

            <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-6">
              <h3 className="text-xl font-bold mb-4">Ajouter une activité</h3>
              {message && <p className="text-sm text-center text-red-400 mb-4">{message}</p>}
              <form onSubmit={handleAddActivity} className="space-y-4">
                <div>
                  <label htmlFor="exercise" className="block text-sm font-medium text-gray-400 mb-1">Exercice</label>
                  <select
                    id="exercise"
                    value={activityInput.exercise}
                    onChange={(e) => setActivityInput({ ...activityInput, exercise: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  >
                    <option value="">Sélectionner un exercice</option>
                    {EXERCISES.map(ex => (
                      <option key={ex.name} value={ex.name}>{ex.name} ({ex.group})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="value" className="block text-sm font-medium text-gray-400 mb-1">Valeur ({EXERCISES.find(ex => ex.name === activityInput.exercise)?.unit || 'unité'})</label>
                  <input
                    id="value"
                    type="number"
                    value={activityInput.value}
                    onChange={(e) => setActivityInput({ ...activityInput, value: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Valeur"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-400 mb-1">Date</label>
                  <input
                    id="date"
                    type="date"
                    value={activityInput.date}
                    onChange={(e) => setActivityInput({ ...activityInput, date: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-orange-600 text-white font-bold rounded-lg shadow-lg hover:bg-orange-700 transition-colors"
                >
                  Ajouter l'activité
                </button>
              </form>
            </div>

            <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
              <h3 className="text-xl font-bold mb-4">Historique des activités</h3>
              {selectedPlayer.activities && selectedPlayer.activities.length > 0 ? (
                <ul className="space-y-3">
                  {[...selectedPlayer.activities].sort((a, b) => b.timestamp - a.timestamp).map((activity, index) => (
                    <li key={index} className="flex justify-between items-center bg-gray-700 p-3 rounded-lg">
                      <div>
                        <div className="font-semibold text-lg text-white">
                          {activity.exercise} - {activity.value} {EXERCISES.find(ex => ex.name === activity.exercise)?.unit}
                        </div>
                        <div className="text-sm text-gray-400">
                          {format(new Date(activity.date), 'EEEE d MMMM yyyy', { locale: fr })}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-orange-400">{activity.points} pts</span>
                        <button
                          onClick={() => confirmDeleteActivity(activity)}
                          className="text-red-500 hover:text-red-400 transition-colors"
                        >
                          <HiX size={20} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400 text-center">Aucune activité enregistrée pour ce joueur.</p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <p>Connexion en cours...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-4">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-orange-400">Bienvenue</h1>
        <p className="text-lg sm:text-xl text-center mb-8 text-gray-300">
          Connectez-vous pour commencer à gérer vos joueurs et leurs activités.
        </p>
        <button
          onClick={() => { /* La logique de connexion est gérée par le useEffect */ }}
          className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-colors"
        >
          Connexion
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col sm:flex-row">
      <div className={`fixed inset-y-0 left-0 transform ${menuOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out sm:relative sm:translate-x-0 w-64 bg-gray-900 shadow-xl z-50 flex-shrink-0`}>
        <div className="flex justify-between items-center p-4 border-b border-gray-800 sm:hidden">
          <h1 className="text-2xl font-bold text-orange-400">
            Performance App
          </h1>
          <button onClick={() => setMenuOpen(false)} className="text-gray-400 hover:text-white">
            <HiX size={28} />
          </button>
        </div>

        <div className="p-4">
          <h2 className="text-xl font-bold text-gray-300 mb-4">Menu</h2>
          <div className="space-y-2">
            <button
              onClick={() => { setView('accueil'); setMenuOpen(false); }}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center transition-colors ${view === 'accueil' ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              <RiDashboardLine size={20} className="mr-3" />
              <span>Accueil</span>
            </button>
            <button
              onClick={() => { setView('gerer-joueurs'); setMenuOpen(false); }}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center transition-colors ${view === 'gerer-joueurs' ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              <RiTeamLine size={20} className="mr-3" />
              <span>Gérer les joueurs</span>
            </button>
          </div>
          
          <div className="mt-8 pt-4 border-t border-gray-800">
            <p className="text-sm text-gray-500 mb-2">Utilisateur : {userId}</p>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 rounded-xl flex items-center transition-colors bg-red-600 text-white hover:bg-red-700"
            >
              <LuLogOut size={20} className="mr-3" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <header className="bg-gray-900 text-white p-4 sm:p-6 flex items-center justify-between shadow-lg sm:hidden">
          <button onClick={() => setMenuOpen(true)} className="text-gray-300 hover:text-white">
            <HiMenu size={28} />
          </button>
          <h1 className="text-2xl font-bold text-orange-400">
            Performance App
          </h1>
          <div className="w-8"></div>
        </header>

        <main className="flex-1 p-0">
          {renderView()}
        </main>
        
        {showDeleteConfirmation && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[100]">
                <div className="bg-gray-900 p-8 rounded-3xl shadow-2xl max-w-lg w-full text-center transform scale-105">
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
