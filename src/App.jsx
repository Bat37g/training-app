import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { format, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

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

// Variables globales fournies par l'environnement
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfigStr = typeof __firebase_config !== 'undefined' ? __firebase_config : JSON.stringify(firebaseConfig);
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let app;
let db;
let auth;

try {
  app = initializeApp(JSON.parse(firebaseConfigStr));
  db = getFirestore(app);
  auth = getAuth(app);
  console.log("Firebase a été initialisé avec succès.");
} catch (e) {
  console.error("Erreur lors de l'initialisation de Firebase :", e);
}

// Définition des exercices
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

const ADMIN_EMAIL = "batou.code@gmail.com";

// Fonctions utilitaires
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
                    {points.toFixed(1)} {currentEmoji}
                </span>
                <span className="text-gray-400">{goal}</span>
            </div>
        </div>
    );
};


// Composant principal de l'application
function App() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [currentPage, setCurrentPage] = useState('MainApp');

  // État pour les pages internes
  const [players, setPlayers] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedExercise, setSelectedExercise] = useState(EXERCISES[0]);
  const [quantity, setQuantity] = useState('');
  const [message, setMessage] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showPlayerDetailsModal, setShowPlayerDetailsModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // État pour la page de gestion des utilisateurs
  const [playerToDelete, setPlayerToDelete] = useState(null);
  const [showDeleteConfirmationAdmin, setShowDeleteConfirmationAdmin] = useState(false);
  const [deletingPlayer, setDeletingPlayer] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');

  // État pour la page d'authentification
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // État pour afficher/masquer le mot de passe
  
  // Nouveau state pour le nom du joueur lors de l'inscription
  const [registerPlayerName, setRegisterPlayerName] = useState('');

  const isAdmin = user && user.email === ADMIN_EMAIL;

  // Effet pour l'authentification
  useEffect(() => {
    const signIn = async () => {
        if (!auth) return;
        try {
            if (initialAuthToken) {
                await signInWithCustomToken(auth, initialAuthToken);
            } else {
                await signInAnonymously(auth);
            }
        } catch (error) {
            console.error("Erreur de connexion Firebase :", error);
        }
    };
    signIn();

    if (!auth) {
        setLoading(false);
        return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setLoading(true);
      if (authUser) {
        setUser(authUser);
        setIsLoggedIn(true);

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

  // Effet pour la récupération des joueurs (pour MainApp et UserManagementPage)
  useEffect(() => {
      if (!db || !isLoggedIn || !user) {
          setPlayers([]);
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
      }, (error) => {
          console.error("Erreur lors de la récupération des données:", error);
          setErrorMessage("Erreur de connexion à la base de données.");
          setLoading(false);
      });

      return () => unsubscribe();
  }, [db, appId, user, isLoggedIn]);


  // Fonctions de l'application principale (MainApp)
  const handleAddTraining = async () => {
    if (!playerName || !quantity) {
        setMessage("Veuillez remplir la quantité.");
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
        handleClosePlayerDetails();
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

  const sortedPlayers = players
    .filter(player => player.email !== ADMIN_EMAIL)
    .sort((a, b) => getTotalWeeklyPoints(b) - getTotalWeeklyPoints(a));

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

  // Fonctions de la page de gestion des utilisateurs
  const handleOpenDeletePlayerConfirmation = (player) => {
    setPlayerToDelete(player);
    setShowDeleteConfirmationAdmin(true);
  };

  const handleCloseDeletePlayerConfirmation = () => {
    setPlayerToDelete(null);
    setShowDeleteConfirmationAdmin(false);
    setAdminMessage('');
  };

  const handleDeletePlayer = async () => {
    if (!playerToDelete) return;
    setDeletingPlayer(true);
    setAdminMessage('');
    try {
        const playerDocRef = doc(db, `artifacts/${appId}/public/data/team_challenge`, playerToDelete.id);
        await deleteDoc(playerDocRef);
        setAdminMessage(`Le joueur ${playerToDelete.name} a été supprimé.`);
        handleCloseDeletePlayerConfirmation();
    } catch (e) {
        console.error("Erreur lors de la suppression du joueur:", e);
        setAdminMessage("Erreur lors de la suppression du joueur. Veuillez réessayer.");
    } finally {
        setDeletingPlayer(false);
    }
  };

  // Fonctions de la page d'authentification
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
        let userCredential;
        if (isLogin) {
            userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log("Connexion réussie");
        } else {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log("Inscription réussie");

            // Enregistrer le nom du joueur dans Firestore
            const playerDocRef = doc(db, `artifacts/${appId}/public/data/team_challenge`, userCredential.user.uid);
            await setDoc(playerDocRef, {
                name: registerPlayerName,
                email: email
            });

            setPlayerName(registerPlayerName);
        }
        setUser(userCredential.user);
        setIsLoggedIn(true);
    } catch (e) {
        console.error("Erreur d'authentification:", e);
        setAuthError(e.message);
    } finally {
        setAuthLoading(false);
    }
  };
  
  const AuthPage = () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-sm">
            {isLogin ? (
                <>
                    <h2 className="text-3xl font-bold text-center mb-6 text-orange-400">Connexion</h2>
                    <form onSubmit={handleAuthSubmit} className="space-y-4">
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-400"
                            required
                        />
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Mot de passe"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-400 pr-10"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                            >
                                {/* Icône d'œil pour montrer/cacher le mot de passe */}
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye-off"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.75 9.75 0 0 0 5.36-1.65"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                                )}
                            </button>
                        </div>
                        <button
                            type="submit"
                            disabled={authLoading}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold p-3 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {authLoading ? 'Connexion...' : 'Se connecter'}
                        </button>
                        {authError && <p className="text-red-400 text-sm text-center mt-2">{authError}</p>}
                    </form>
                    <p className="mt-6 text-center text-sm">
                        Pas encore de compte ?{' '}
                        <button onClick={() => { setIsLogin(false); setAuthError(''); }} className="text-orange-400 hover:underline">
                            Créer un compte
                        </button>
                    </p>
                </>
            ) : (
                <>
                    {/* Ajout du logo sur la page d'inscription */}
                    <div className="flex justify-center mb-6">
                        <img src="https://placehold.co/150x150/000000/FFFFFF/png?text=TNT+Logo" alt="TNT Logo" className="h-24 w-24 object-contain rounded-full" />
                    </div>
                    <h2 className="text-3xl font-bold text-center mb-6 text-orange-400">Créer un compte</h2>
                    <form onSubmit={handleAuthSubmit} className="space-y-4">
                        {/* Ajout du champ pour le nom du joueur */}
                        <input
                            type="text"
                            placeholder="Nom du joueur"
                            value={registerPlayerName}
                            onChange={(e) => setRegisterPlayerName(e.target.value)}
                            className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-400"
                            required
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-400"
                            required
                        />
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Mot de passe"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-400 pr-10"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                            >
                                {/* Icône d'œil pour montrer/cacher le mot de passe */}
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye-off"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.75 9.75 0 0 0 5.36-1.65"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                                )}
                            </button>
                        </div>
                        <button
                            type="submit"
                            disabled={authLoading}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold p-3 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {authLoading ? "Inscription..." : "S'inscrire"}
                        </button>
                        {authError && <p className="text-red-400 text-sm text-center mt-2">{authError}</p>}
                    </form>
                    <p className="mt-6 text-center text-sm">
                        Déjà un compte ?{' '}
                        <button onClick={() => { setIsLogin(true); setAuthError(''); }} className="text-orange-400 hover:underline">
                            Se connecter
                        </button>
                    </p>
                </>
            )}
        </div>
    </div>
  );

  const Header = () => (
    <header className="flex flex-col sm:flex-row justify-between items-center bg-gray-900 text-white p-4 shadow-lg sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-orange-400">Team Challenge</h1>
        <div className="text-center sm:text-right">
            <div className="text-lg font-semibold">Bienvenue, <span className="text-orange-400">{playerName}</span> !</div>
            <div className="text-xs text-gray-400">{user.uid}</div>
            <button onClick={() => signOut(auth)} className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors">
                Déconnexion
            </button>
        </div>
    </header>
  );

  const PlayerDetailsModal = ({ player, onClose }) => {
    if (!player) return null;
    const sortedActivities = (player.allActivities || []).sort((a, b) => b.timestamp - a.timestamp);

    const getGroupEmoji = (groupName) => {
        switch (groupName) {
            case 'Groupe Rouge': return '🔴';
            case 'Groupe Bleu': return '�';
            case 'Groupe Vert': return '🟢';
            default: return '';
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-lg overflow-y-auto max-h-[90vh] custom-scrollbar">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-2xl font-bold text-white">Détails de {player.name}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-gray-700 p-4 rounded-xl">
                            <h4 className="font-semibold text-orange-300">Total Hebdomadaire</h4>
                            <p className="text-white text-xl">{getTotalWeeklyPoints(player).toFixed(1)} points</p>
                        </div>
                        <div className="bg-gray-700 p-4 rounded-xl">
                            <h4 className="font-semibold text-orange-300">Scores par Groupe</h4>
                            <ul className="text-white">
                                <li>
                                    {getGroupEmoji('Groupe Rouge')} Rouge: {getGroupPoints(player, 'Groupe Rouge').toFixed(1)} pts
                                </li>
                                <li>
                                    {getGroupEmoji('Groupe Bleu')} Bleu: {getGroupPoints(player, 'Groupe Bleu').toFixed(1)} pts
                                </li>
                                <li>
                                    {getGroupEmoji('Groupe Vert')} Vert: {getGroupPoints(player, 'Groupe Vert').toFixed(1)} pts
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold text-orange-300 mb-2">Activités récentes</h4>
                        {sortedActivities.length > 0 ? (
                            <ul className="space-y-2 text-white">
                                {sortedActivities.slice(0, 5).map((activity, index) => (
                                    <li key={index} className="flex justify-between items-center bg-gray-700 p-3 rounded-lg">
                                        <div>
                                            <span className="font-bold">{activity.exercise}</span> - {activity.quantity} {EXERCISES.find(e => e.name === activity.exercise)?.unit}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-semibold">{activity.points.toFixed(1)} pts</div>
                                            <div className="text-xs text-gray-400">{format(new Date(activity.date), 'dd/MM/yyyy')}</div>
                                        </div>
                                        {isAdmin && (
                                            <button
                                                onClick={() => handleOpenDeleteConfirmation(activity)}
                                                className="text-red-400 hover:text-red-600 transition-colors ml-2"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-400">Aucune activité enregistrée.</p>
                        )}
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-colors">
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
  };
  
  const DeleteConfirmationModal = () => (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-lg">
            <h3 className="text-2xl font-bold text-white mb-4">Confirmer la suppression</h3>
            <p className="text-gray-300 mb-6">
                Êtes-vous sûr de vouloir supprimer l'activité <span className="font-bold text-orange-400">{activityToDelete.exercise}</span> du {format(new Date(activityToDelete.date), 'dd/MM/yyyy')} ?
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
  );
  
  const AdminDeleteConfirmationModal = () => (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-lg">
            <h3 className="text-2xl font-bold text-white mb-4">Confirmer la suppression du joueur</h3>
            <p className="text-gray-300 mb-6">
                Êtes-vous sûr de vouloir supprimer définitivement le joueur <span className="font-bold text-orange-400">{playerToDelete?.name}</span> ?
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
  );

  const UserManagementPage = () => (
    <div className="min-h-screen bg-gray-950 text-white p-4">
        <h2 className="text-3xl font-bold text-center mb-6 text-orange-400">Gestion des utilisateurs</h2>
        <div className="overflow-x-auto bg-gray-800 rounded-xl shadow-lg mb-6">
            <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Nom du joueur
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Email
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            UID
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {players.map(player => (
                        <tr key={player.id} className="hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{player.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{player.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{player.id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button onClick={() => handleOpenDeletePlayerConfirmation(player)} className="text-red-400 hover:text-red-600 transition-colors">
                                    Supprimer
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <div className="text-center">
            <button onClick={() => setCurrentPage('MainApp')} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors">
                Retour à l'application
            </button>
        </div>
    </div>
  );

  const MainApp = () => (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-8">
        <h2 className="text-3xl font-bold text-center mb-6 text-orange-400">Classement de la semaine {getWeekNumber(new Date())}</h2>
        
        {/* Section d'ajout d'entraînement */}
        <div className="bg-gray-800 p-6 rounded-2xl shadow-xl mb-8">
            <h3 className="text-2xl font-semibold mb-4 text-orange-400">Ajouter un entraînement</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleAddTraining(); }} className="space-y-4">
                <select
                    value={selectedExercise.id}
                    onChange={(e) => setSelectedExercise(EXERCISES.find(ex => ex.id === parseInt(e.target.value)))}
                    className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                    {EXERCISES.map(ex => (
                        <option key={ex.id} value={ex.id}>{ex.emoji} {ex.name} ({ex.points} points par {ex.pointsPer} {ex.unit})</option>
                    ))}
                </select>
                <input
                    type="number"
                    placeholder={`Quantité en ${selectedExercise.unit}`}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    required
                />
                <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold p-3 rounded-lg transition-colors">
                    Enregistrer l'entraînement
                </button>
            </form>
            {message && <p className="mt-4 text-center text-sm font-semibold">{message}</p>}
        </div>

        {/* Section classement et gestion admin */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-800 p-6 rounded-2xl shadow-xl">
                <h3 className="text-2xl font-semibold mb-4 text-orange-400">Classement des joueurs</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-700">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Rang
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Nom du joueur
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Points
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {sortedPlayers.map((player, index) => (
                                <tr key={player.id} className="hover:bg-gray-700 cursor-pointer" onClick={() => handleOpenPlayerDetails(player)}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{index + 1}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{player.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-white">{getTotalWeeklyPoints(player).toFixed(1)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isAdmin && (
                <div className="bg-gray-800 p-6 rounded-2xl shadow-xl">
                    <h3 className="text-2xl font-semibold mb-4 text-orange-400">Administration</h3>
                    <div className="text-center">
                        <p className="text-gray-300 mb-4">Gérer les utilisateurs et leurs activités.</p>
                        <button onClick={() => setCurrentPage('UserManagement')} className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors">
                            Gérer les utilisateurs
                        </button>
                    </div>
                </div>
            )}
        </div>
        {selectedPlayer && showPlayerDetailsModal && <PlayerDetailsModal player={selectedPlayer} onClose={handleClosePlayerDetails} />}
        {activityToDelete && showDeleteConfirmation && <DeleteConfirmationModal />}
    </div>
  );


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
        <div className="text-xl">Chargement de l'authentification...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
      return <AuthPage />;
  }

  if (currentPage === 'UserManagement' && isAdmin) {
      return <UserManagementPage />;
  }

  return (
    <>
      <Header />
      <MainApp />
      {showDeleteConfirmationAdmin && <AdminDeleteConfirmationModal />}
    </>
  );
}

export default App;
