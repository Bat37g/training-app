import React, { useState, useEffect } from 'react';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut,
    createUserWithEmailAndPassword
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    onSnapshot, 
    collection, 
    updateDoc, 
    getDoc, 
    deleteDoc,
    getDocs,
    query,
    where
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

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

// L'email de l'administrateur pour la gestion des joueurs
const ADMIN_EMAIL = 'batiste.desmarchais@gmail.com';

// Composant pour le menu burger
const BurgerMenu = ({ currentUser, handleLogout, players, isAdmin }) => {
    const [isOpen, setIsOpen] = useState(false);
    const currentPlayer = players.find(p => p.id === currentUser?.uid);
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
                            {currentPlayer?.name || currentUser.email} {isAdmin && <span className="text-xs text-orange-400">(Admin)</span>}
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
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const isAdmin = currentUser && currentUser.email === ADMIN_EMAIL;

    // Initialisation de l'authentification
    useEffect(() => {
        if (!isFirebaseConnected || !auth) {
            console.error("Firebase n'est pas connecté. L'application ne fonctionnera pas correctement.");
            return;
        }

        const unsub = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
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

    const deletePlayer = async (playerId) => {
        if (!isAdmin || !isFirebaseConnected) {
            console.error("Permission refusée. Seul l'administrateur peut supprimer un joueur.");
            return;
        }

        const playerDocRef = doc(db, `artifacts/${appID}/public/data/players/${playerId}`);
        
        try {
            // Suppression des activités du joueur
            const activitiesQuery = collection(playerDocRef, 'activities');
            const activitiesSnapshot = await getDocs(activitiesQuery);
            const deletePromises = activitiesSnapshot.docs.map(actDoc => deleteDoc(doc(playerDocRef, 'activities', actDoc.id)));
            await Promise.all(deletePromises);
            
            // Suppression du document joueur lui-même
            await deleteDoc(playerDocRef);
            
            console.log(`Joueur ${playerId} et ses activités supprimés.`);
            setSelectedPlayer(null); // Retourne à la liste
        } catch (e) {
            console.error("Erreur lors de la suppression du joueur:", e);
        }
    };

    const handleLogout = async () => {
        if (isFirebaseConnected && auth) {
            try {
                await signOut(auth);
                setCurrentUser(null);
                setSelectedPlayer(null);
            } catch (error) {
                console.error("Erreur lors de la déconnexion:", error);
            }
        }
    };

    // Composant de connexion
    const LoginScreen = () => {
        const [email, setEmail] = useState('');
        const [password, setPassword] = useState('');
        const [error, setError] = useState('');
        const [loading, setLoading] = useState(false);
        const [isRegistering, setIsRegistering] = useState(false);

        const handleLogin = async (e) => {
            e.preventDefault();
            setError('');
            setLoading(true);
            try {
                await signInWithEmailAndPassword(auth, email, password);
                setLoading(false);
            } catch (err) {
                console.error("Erreur de connexion:", err);
                setError("Nom d'utilisateur ou mot de passe incorrect.");
                setLoading(false);
            }
        };

        const handleRegister = async (e) => {
            e.preventDefault();
            setError('');
            setLoading(true);
            const playerName = e.target.playerName.value.trim();
            if (playerName === '') {
                setError("Veuillez entrer un nom de joueur.");
                setLoading(false);
                return;
            }

            try {
                // Vérification du doublon de nom de joueur (insensible à la casse)
                const playersRef = collection(db, `artifacts/${appID}/public/data/players`);
                const q = query(playersRef, where("name", "==", playerName));
                const querySnapshot = await getDocs(q);
                
                let nameExists = false;
                querySnapshot.forEach(doc => {
                    if (doc.data().name.toLowerCase() === playerName.toLowerCase()) {
                        nameExists = true;
                    }
                });

                if (nameExists) {
                    setError("Un joueur avec ce nom existe déjà. Veuillez en choisir un autre.");
                    setLoading(false);
                    return;
                }

                // Si le nom est unique, on procède à l'inscription
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                await setDoc(doc(playersRef, user.uid), {
                    name: playerName,
                    email: user.email,
                    totalPoints: 0
                });
                setLoading(false);
            } catch (err) {
                console.error("Erreur d'inscription:", err);
                setError(err.message || "Une erreur est survenue lors de l'inscription.");
                setLoading(false);
            }
        };

        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-950 p-4">
                <div className="bg-gray-900 p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-gray-700">
                    <h2 className="text-3xl font-bold text-orange-400 mb-6 text-center">{isRegistering ? 'Inscription' : 'Connexion'}</h2>
                    {isRegistering ? (
                        <form onSubmit={handleRegister} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Nom du joueur</label>
                                <input
                                    type="text"
                                    name="playerName"
                                    className="w-full p-3 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full p-3 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Mot de passe</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full p-3 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    required
                                />
                            </div>
                            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full p-3 bg-orange-500 text-white font-bold rounded-full hover:bg-orange-600 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Inscription...' : 'Créer un compte'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsRegistering(false)}
                                className="w-full p-3 mt-4 text-gray-400 hover:text-orange-400 transition-colors"
                            >
                                Retour à la connexion
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full p-3 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Mot de passe</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full p-3 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    required
                                />
                            </div>
                            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full p-3 bg-orange-500 text-white font-bold rounded-full hover:bg-orange-600 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Connexion...' : 'Se connecter'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsRegistering(true)}
                                className="w-full p-3 mt-4 text-gray-400 hover:text-orange-400 transition-colors"
                            >
                                Créer un compte
                            </button>
                        </form>
                    )}
                </div>
            </div>
        );
    };

    const PlayerDetails = ({ player, onBack }) => {
        const [activities, setActivities] = useState([]);
        const [isModalOpen, setIsModalOpen] = useState(false);
        const [newActivity, setNewActivity] = useState({ date: '', exercise: '', quantity: '' });
        const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
        const [activityToDelete, setActivityToDelete] = useState(null);
        const [deleting, setDeleting] = useState(false);
        const [message, setMessage] = useState('');
        const [showPlayerDeleteConfirmation, setShowPlayerDeleteConfirmation] = useState(false);

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

        const handleDeletePlayer = () => {
            deletePlayer(player.id);
            setShowPlayerDeleteConfirmation(false);
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
                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={onBack}
                        className="text-orange-400 font-bold hover:text-orange-300 transition-colors duration-200"
                    >
                        &larr; Retour au classement
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => setShowPlayerDeleteConfirmation(true)}
                            className="bg-red-600 text-white font-bold px-4 py-2 rounded-full hover:bg-red-700 transition-colors"
                        >
                            Supprimer le joueur
                        </button>
                    )}
                </div>
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
                {showPlayerDeleteConfirmation && (
                    <div className="fixed inset-0 bg-gray-950 bg-opacity-80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-gray-900 p-8 rounded-3xl shadow-2xl w-full max-w-md border border-gray-700">
                            <h3 className="text-2xl font-bold text-red-400 mb-4 text-center">Confirmer la suppression du joueur</h3>
                            <p className="text-gray-300 mb-6 text-center">
                                Êtes-vous sûr de vouloir supprimer le joueur <span className="font-bold text-orange-400">{player.name}</span> ? Cette action est irréversible et supprimera également toutes ses activités.
                            </p>
                            <div className="flex justify-center space-x-4">
                                <button
                                    onClick={() => setShowPlayerDeleteConfirmation(false)}
                                    className="px-6 py-2 bg-gray-700 text-white rounded-full shadow-lg hover:bg-gray-600 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleDeletePlayer}
                                    className="px-6 py-2 bg-red-600 text-white font-bold rounded-full shadow-lg hover:bg-red-700 transition-colors"
                                >
                                    Supprimer
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderMainContent = () => {
        if (!isAuthReady) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen text-center p-8">
                    <h2 className="text-3xl font-bold text-orange-400 mb-4">Bienvenue !</h2>
                    <p className="text-lg text-gray-300">Veuillez patienter pendant le chargement...</p>
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mt-6"></div>
                </div>
            );
        }

        if (!currentUser) {
            return <LoginScreen />;
        }

        const currentPlayer = players.find(p => p.id === currentUser.uid);

        if (selectedPlayer) {
            return <PlayerDetails player={selectedPlayer} onBack={() => setSelectedPlayer(null)} />;
        }
        
        return (
            <>
                {/* Section d'ajout de joueur, visible uniquement pour les joueurs non enregistrés */}
                {!currentPlayer && (
                    <div className="p-6 bg-gray-900 rounded-3xl shadow-2xl mb-8 border border-gray-700">
                        <h2 className="text-2xl font-bold text-orange-400 mb-4">Ajouter votre nom de joueur</h2>
                        <p className="text-gray-300 mb-4">Votre compte n'est pas encore associé à un nom de joueur. Veuillez en créer un ci-dessous.</p>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const playerName = e.target.playerName.value.trim();
                            if (playerName === '') return;
                            const playersRef = collection(db, `artifacts/${appID}/public/data/players`);
                            try {
                                // Vérification du doublon de nom de joueur (insensible à la casse)
                                const q = query(playersRef, where("name", "==", playerName));
                                const querySnapshot = await getDocs(q);

                                let nameExists = false;
                                querySnapshot.forEach(doc => {
                                    if (doc.data().name.toLowerCase() === playerName.toLowerCase()) {
                                        nameExists = true;
                                    }
                                });
                                
                                if (nameExists) {
                                    console.error("Un joueur avec ce nom existe déjà.");
                                    return;
                                }

                                await setDoc(doc(playersRef, currentUser.uid), {
                                    name: playerName,
                                    email: currentUser.email,
                                    totalPoints: 0
                                });
                            } catch (error) {
                                console.error("Erreur lors de l'ajout du joueur:", error);
                            }
                        }} className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                            <input
                                type="text"
                                name="playerName"
                                placeholder="Nom du joueur"
                                className="flex-grow p-3 bg-gray-800 text-white rounded-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                required
                            />
                            <button
                                type="submit"
                                className="p-3 bg-orange-500 text-white font-bold rounded-full hover:bg-orange-600 transition-colors duration-200"
                            >
                                Ajouter mon nom
                            </button>
                        </form>
                    </div>
                )}
                
                {/* Classement des joueurs, visible uniquement si le joueur est enregistré */}
                {currentPlayer && (
                    <div className="p-6 bg-gray-900 rounded-3xl shadow-2xl border border-gray-700">
                        <h2 className="text-2xl font-bold text-orange-400 mb-4">Classement des joueurs</h2>
                        <ul className="space-y-4">
                            {players.map((player, index) => (
                                <li key={player.id}>
                                    <div className="w-full text-left p-4 bg-gray-800 rounded-2xl shadow-md hover:bg-gray-700 transition-colors duration-200 flex items-center justify-between">
                                        <button
                                            onClick={() => setSelectedPlayer(player)}
                                            className="flex items-center space-x-4 flex-grow focus:outline-none"
                                        >
                                            <span className="text-xl font-extrabold text-orange-400 w-8 text-center">
                                                {index === 0 && '🏆'}
                                                {index === 1 && '🥈'}
                                                {index > 1 && `${index + 1}.`}
                                            </span>
                                            <span className="text-lg font-semibold text-white">{player.name}</span>
                                        </button>
                                        <div className="flex items-center space-x-4">
                                            <span className="text-xl font-bold text-orange-400">{player.totalPoints.toFixed(1)} Pts</span>
                                            {isAdmin && (
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm(`Voulez-vous vraiment supprimer le joueur ${player.name} ?`)) {
                                                            deletePlayer(player.id);
                                                        }
                                                    }}
                                                    className="text-red-500 hover:text-red-600 transition-colors"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </>
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
                    {currentUser && players.find(p => p.id === currentUser.uid) && (
                        <div className="text-right hidden md:block">
                            <p className="text-sm text-gray-300">Bonjour,</p>
                            <p className="text-xl font-bold text-orange-400">{players.find(p => p.id === currentUser.uid)?.name || 'Utilisateur'}</p>
                            <div className="mt-2 text-xs text-gray-400">Progression : {players.find(p => p.id === currentUser.uid)?.totalPoints.toFixed(1) || 0}/200 pts</div>
                            <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                                <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${Math.min(((players.find(p => p.id === currentUser.uid)?.totalPoints || 0) / 200) * 100, 100)}%` }}></div>
                            </div>
                        </div>
                    )}
                    {currentUser && <BurgerMenu currentUser={currentUser} handleLogout={handleLogout} players={players} isAdmin={isAdmin} />}
                </div>
            </header>

            <div className="max-w-7xl mx-auto">
                {renderMainContent()}
            </div>
            
            <footer className="mt-8 text-center text-xs text-gray-500">
                <p>Version 3.8.1</p>
            </footer>
        </div>
    );
};

export default App;
