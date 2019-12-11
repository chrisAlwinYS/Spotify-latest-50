import React, { useState, useEffect } from 'react';
import { useCookies } from 'react-cookie';
import Track from './components/Track';
import './App.css';


function getUrlVars() {
  let vars = {};
  window.location.href.replace(/[#&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
    vars[key] = value;
  });
  return vars;
}
function getUrlParam(parameter, defaultvalue){
  let urlparameter = defaultvalue;
  if(window.location.href.indexOf(parameter) > -1){
    urlparameter = getUrlVars()[parameter];
  }
  return urlparameter;
}


function App() {

  const [cookies, setCookie] = useCookies(['spotifyAuth']);

  const [appMessage, setAppMessage] = useState(false);
  const [spotifyAuthToken, setSpotifyAuthToken] = useState(cookies.spotifyAuth ?? '');
  const [recentTracks, setRecentTracks] = useState([]);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [selectedPlaylistTracks, setSelectedPlaylistTracks] = useState({id: null, tracks: []});

  let playlistSelect = React.createRef();

  let authURL;


  useEffect(() => {
    if (spotifyAuthToken && spotifyAuthToken !== ''){
      // get user playlists
      callUserPlaylists();
      handleGetRecentTracks();
    }
  },[spotifyAuthToken]);


  if (window.location) {
    authURL = `https://accounts.spotify.com/authorize?client_id=3c95ead3ff304c1abec74cb852d12583&redirect_uri=http:%2F%2F${window.location.host}&scope=user-read-recently-played%20playlist-read-private%20playlist-modify-public%20playlist-modify-private&response_type=token&state=123`;

    const accessToken = getUrlParam('access_token');
    if (accessToken && accessToken !== spotifyAuthToken) {
      setSpotifyAuthToken(accessToken)
      setCookie('spotifyAuth', accessToken, { path: '/' });
      window.history.pushState({}, document.title, "/" );
    }
  }

  const callUserPlaylists = async (offset = 0) => {
    let response = await makeGetRequest(`https://api.spotify.com/v1/me/playlists?offset=${offset}&limit=50`);
    let data = await response.json();

    if (checkForAuthError(data)){
      setUserPlaylists([...userPlaylists, ...data.items]);
    }

    //Used to get the next set of Playlists is needed
    if (data.items && data.items.length === 50) {
      callUserPlaylists(userPlaylists.length);
    }
  };

  const makeGetRequest = async (url) => {
    return  await fetch(url, {
      headers: {
        'Authorization': 'Bearer '+spotifyAuthToken
      },
    })
  };

  const setupTracksforSending = () => {
    let tracks = [];
    for(let i=0; i < selectedTracks.length; i++){
      if (!handleInPlaylist(selectedTracks[i])){
        tracks = [...tracks, `spotify:track:${selectedTracks[i]}`]
      }
    }
    return tracks;
  };


  const addToPlaylist = async () => {
    let currentPlaylist = playlistSelect.current.value;
    const url = `https://api.spotify.com/v1/playlists/${currentPlaylist}/tracks`;
    let data = `{"uris": ${JSON.stringify(setupTracksforSending())}}`;
    // Default options are marked with *
    const response = await fetch(url, {
      method: 'POST', // *GET, POST, PUT, DELETE, etc.
      mode: 'cors', // no-cors, *cors, same-origin
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      credentials: 'same-origin', // include, *same-origin, omit
      headers: {
        'Authorization': 'Bearer '+spotifyAuthToken,
        'Content-Type': 'application/json'
        // 'Content-Type': 'application/x-www-form-urlencoded',
      },
      redirect: 'follow', // manual, *follow, error
      referrer: 'no-referrer', // no-referrer, *client
      body: data // body data type must match "Content-Type" header
    });
    setSelectedTracks([]);
    getSelectedPlaylistTracks(true, currentPlaylist);
    return await response.json();
  };

  const getSelectedPlaylistTracks = async (forceRequest = false, currentSelectedPlaylist = null) => {
    if (currentSelectedPlaylist === null) {
      currentSelectedPlaylist = playlistSelect.current.value;
    }
    if (forceRequest || (currentSelectedPlaylist && selectedPlaylistTracks.id !== currentSelectedPlaylist)) {
      let response = await makeGetRequest(`https://api.spotify.com/v1/playlists/${currentSelectedPlaylist}/tracks?fields=items(track(id))`);
      let data = await response.json();
      if (checkForAuthError(data) && data.items){
        let tracks = [];
        for (let i = 0; i < data.items.length; i++){
          tracks.push(data.items[i].track.id);
        }
        setSelectedPlaylistTracks({id: currentSelectedPlaylist, tracks:[...tracks]})
      }
    }
  };


  const checkForAuthError = (data) => {
    if (data.error && data.error.status === 401 && data.error.message === "The access token expired"){
      setSpotifyAuthToken('');
      window.history.pushState({}, document.title, "/" );
      setAppMessage('Spotify session Expired Please Login again.')
      return false;
    }
    return true;
  }



  // the Limit is 50 there are no more after that
  const handleGetRecentTracks = async (url = 'https://api.spotify.com/v1/me/player/recently-played?limit=50') => {
    let response = await makeGetRequest(url);
    let data = await response.json();

    if (checkForAuthError(data)){
      setRecentTracks([...data.items]);
    }

  };

  const toggleTrackSelected = (id) => {
    getSelectedPlaylistTracks();
    let tracks = [...selectedTracks];
    if (tracks.indexOf(id) !== -1) {
      tracks.splice(tracks.indexOf(id), 1);
    }else {
      if (!handleInPlaylist(id)){
        tracks = [...tracks, id];
      }
    }
    setSelectedTracks([...tracks]);
  };

  const selectAllTracks = () => {
    getSelectedPlaylistTracks();
    let tracks = [];
    for(let i=0; i < recentTracks.length; i++){
      if (!handleInPlaylist(recentTracks[i].track.id)) {
        tracks = [...tracks, recentTracks[i].track.id]
      }
    }
    setSelectedTracks([...tracks])
  }

  // Is the track Selected
  const selectTrack = (id) => {
    let tracks = [...selectedTracks];
    return tracks.indexOf(id) !== -1;
  }

  const handleInPlaylist = (id) => {
    // 1Cae1YAN5Tf4CPfnWz3nmj
    if (selectedPlaylistTracks && selectedPlaylistTracks.tracks) {
      if (selectedPlaylistTracks.tracks.indexOf(id) !== -1){
        return true;
      }
    }
    return false;
  }


  return (
    <div className="App">
      <header className="App-header">
        <h1>Spotify Last 50 Played</h1>

        {spotifyAuthToken &&
          <h5>Selected songs: {selectedTracks.length}</h5>
        }

        {appMessage && <span className="appMessage">{appMessage}</span>}

        {!spotifyAuthToken && <a href={authURL}>Login to Spotify</a>}

        {spotifyAuthToken &&
          <div>
            {(userPlaylists && userPlaylists.length > 1) &&
            <select ref={playlistSelect} onChange={() => getSelectedPlaylistTracks()}>
              {userPlaylists.map((playlist, key) =>
                <option key={key} value={playlist.id}>{playlist.name}</option>
              )}
            </select>
            }
            {(recentTracks && recentTracks.length > 0) &&
            <React.Fragment>
              <button onClick={() => addToPlaylist()}>Add to playlist</button>
              <button onClick={() => selectAllTracks()}>Select All</button>
              <button onClick={() => setSelectedTracks([])}>Clear All</button>
            </React.Fragment>
            }
            {(recentTracks && recentTracks.length > 0) && recentTracks.map((track, key) =>
              <Track key={key} track={track.track} played_at={track.played_at} onClick={() => toggleTrackSelected(track.track.id)} selectedTrack={selectTrack(track.track.id)} inPlaylist={handleInPlaylist(track.track.id)} />
            )}
          </div>
        }

      </header>
    </div>
  );
}

export default App;