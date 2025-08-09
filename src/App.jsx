import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, updateDoc, getDoc, deleteDoc, arrayRemove, arrayUnion } from 'firebase/firestore';

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

// Création de l'application React principale
const App = () => {
  // Hooks pour gérer l'état de l'application
  const [isFirebaseInitialized, setIsFirebaseInitialized] = useState(false);
  const [user, setUser] = useState(null);
  const [players, setPlayers] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showPlayerDetails, setShowPlayerDetails] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showDeletePlayerConfirmation, setShowDeletePlayerConfirmation] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState(null);
  const [deletingPlayer, setDeletingPlayer] = useState(false);

  // NOUVEL ÉTAT POUR GÉRER L'EXPANSION DE LA CARTE D'UN JOUEUR
  const [expandedPlayerId, setExpandedPlayerId] = useState(null);

  // Effet pour initialiser Firebase et l'authentification
  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        
        if (initialAuthToken) {
          await signInWithCustomToken(auth, initialAuthToken);
        } else {
          await signInAnonymously(auth);
        }

        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
          setUser(currentUser);
          setIsFirebaseInitialized(true);
          setIsLoading(false);
        });

        return () => unsubscribeAuth();
      } catch (error) {
        console.error("Erreur d'initialisation de Firebase :", error);
        setIsLoading(false);
      }
    };

    initializeFirebase();
  }, []);

  // Effet pour écouter les changements dans la base de données Firestore
  useEffect(() => {
    if (!isFirebaseInitialized || !user) return;

    const userId = user.uid;
    const playersCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/players`);

    const unsubscribe = onSnapshot(playersCollectionRef, (snapshot) => {
      const playersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPlayers(playersList);
    }, (error) => {
      console.error("Erreur lors de la récupération des joueurs :", error);
    });

    return () => unsubscribe();
  }, [isFirebaseInitialized, user]);

  // Fonctions de gestion de l'état de l'interface utilisateur
  const handleToggleAddPlayer = () => setShowAddPlayer(!showAddPlayer);
  const handleShowPlayerDetails = (player) => {
    setSelectedPlayer(player);
    setShowPlayerDetails(true);
  };
  const handleClosePlayerDetails = () => {
    setSelectedPlayer(null);
    setShowPlayerDetails(false);
  };
  const handleShowDeletePlayerConfirmation = (player) => {
    setPlayerToDelete(player);
    setShowDeletePlayerConfirmation(true);
  };
  const handleCloseDeletePlayerConfirmation = () => {
    setPlayerToDelete(null);
    setShowDeletePlayerConfirmation(false);
  };
  const handleAddPlayer = async () => {
    if (newPlayerName.trim() === '') return;
    const userId = user.uid;
    try {
      const playersCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/players`);
      await setDoc(doc(playersCollectionRef, newPlayerName.trim()), {
        name: newPlayerName.trim(),
        activities: []
      });
      setNewPlayerName('');
      setShowAddPlayer(false);
    } catch (error) {
      console.error("Erreur lors de l'ajout du joueur :", error);
    }
  };
  const handleUpdateActivity = async (playerId, activity, value) => {
    const userId = user.uid;
    try {
      const playerDocRef = doc(db, `artifacts/${appId}/users/${userId}/players`, playerId);
      await updateDoc(playerDocRef, {
        [activity]: value
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'activité :", error);
    }
  };
  const handleDeletePlayer = async () => {
    if (!playerToDelete || !user) return;
    setDeletingPlayer(true);
    const userId = user.uid;
    try {
      const playerDocRef = doc(db, `artifacts/${appId}/users/${userId}/players`, playerToDelete.id);
      await deleteDoc(playerDocRef);
      handleCloseDeletePlayerConfirmation();
    } catch (error) {
      console.error("Erreur lors de la suppression du joueur :", error);
    } finally {
      setDeletingPlayer(false);
    }
  };
  const handleAddPlayerActivity = async (playerId, newActivity) => {
    const userId = user.uid;
    try {
      const playerDocRef = doc(db, `artifacts/${appId}/users/${userId}/players`, playerId);
      await updateDoc(playerDocRef, {
        activities: arrayUnion(newActivity)
      });
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'activité :", error);
    }
  };
  const handleRemovePlayerActivity = async (playerId, activityToRemove) => {
    const userId = user.uid;
    try {
      const playerDocRef = doc(db, `artifacts/${appId}/users/${userId}/players`, playerId);
      await updateDoc(playerDocRef, {
        activities: arrayRemove(activityToRemove)
      });
    } catch (error) {
      console.error("Erreur lors de la suppression de l'activité :", error);
    }
  };
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      window.location.reload();
    } catch (error) {
      console.error("Erreur lors de la déconnexion :", error);
    }
  };

  // Logique pour basculer l'affichage des détails du joueur (les groupes)
  const handlePlayerCardClick = (playerId) => {
    // Si la carte est déjà ouverte, la fermer, sinon l'ouvrir
    setExpandedPlayerId(expandedPlayerId === playerId ? null : playerId);
  };
  
  // Rendu des composants de l'interface utilisateur
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-gray-200">
        <svg className="animate-spin h-8 w-8 text-orange-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="ml-3">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans antialiased flex flex-col items-center p-4">
      {/* En-tête de l'application */}
      <header className="w-full max-w-4xl text-center mb-8 mt-4">
        <h1 className="text-4xl font-bold text-orange-400 mb-2">Gestion des Joueurs</h1>
        <p className="text-gray-400">Suivez les activités et la progression de vos joueurs</p>
      </header>
      
      {/* Section des joueurs */}
      <section className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-200">Liste des Joueurs ({players.length})</h2>
          <div className="flex space-x-2">
            <button
              onClick={handleToggleAddPlayer}
              className="bg-orange-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-orange-600 transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Ajouter un joueur
            </button>
            <button
              onClick={handleSignOut}
              className="bg-gray-700 text-white px-4 py-2 rounded-full shadow-lg hover:bg-gray-600 transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h6a1 1 0 110 2H4v12h12V9a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V3zm11.707 1.293a1 1 0 010 1.414L16.414 8l-2.707 2.707a1 1 0 11-1.414-1.414L14.586 8H9a1 1 0 110-2h5.586l-2.293-2.293a1 1 0 011.414-1.414z" clipRule="evenodd" />
              </svg>
              Déconnexion
            </button>
          </div>
        </div>
        
        {/* Formulaire pour ajouter un joueur */}
        {showAddPlayer && (
          <div className="bg-gray-800 p-6 rounded-2xl shadow-xl mb-6">
            <h3 className="text-xl font-bold text-white mb-4">Ajouter un nouveau joueur</h3>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="Nom du joueur"
                className="flex-1 p-3 rounded-full bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                onClick={handleAddPlayer}
                className="bg-orange-500 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:bg-orange-600 transition-colors"
              >
                Ajouter
              </button>
            </div>
          </div>
        )}
        
        {/* Liste des cartes de joueur */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {players.map((player) => (
            <div key={player.id} className="bg-gray-800 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <div
                onClick={() => handlePlayerCardClick(player.id)}
                className="cursor-pointer"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-bold text-orange-400">{player.name}</h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Empêche l'événement de se propager au parent (le clic sur la carte)
                      handleShowDeletePlayerConfirmation(player);
                    }}
                    className="text-gray-500 hover:text-red-500 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Contenu des groupes, affiché conditionnellement */}
              {expandedPlayerId === player.id && (
                <div className="space-y-4 mt-4">
                  {/* Visuel du Groupe 1 */}
                  <div className="bg-orange-600 text-white p-4 rounded-xl flex items-center justify-between">
                    <h4 className="font-bold">Groupe 1</h4>
                    <span className="text-sm">Activités et statistiques</span>
                  </div>
                  {/* Visuel du Groupe 2 */}
                  <div className="bg-blue-600 text-white p-4 rounded-xl flex items-center justify-between">
                    <h4 className="font-bold">Groupe 2</h4>
                    <span className="text-sm">Défis et objectifs</span>
                  </div>
                  {/* Visuel du Groupe 3 */}
                  <div className="bg-purple-600 text-white p-4 rounded-xl flex items-center justify-between">
                    <h4 className="font-bold">Groupe 3</h4>
                    <span className="text-sm">Historique de performance</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Modale de confirmation de suppression */}
      {showDeletePlayerConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
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

      {/* Pied de page */}
      <footer className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-gray-500 text-sm">
        ID d'application : {appId}
      </footer>
    </div>
  );
};

export default App;
