import React from "react";
import dateFormat from "dateformat"
import "./Track.scss";

export default ({track, played_at, onClick, selectedTrack, inPlaylist}) =>{

  const trackPlayed = (playedAt) => {
    let date = new Date(playedAt);
    return dateFormat(date, "ddd, mmm dS, yyyy, h:MM:ss TT");
  }



  return (
    <div className={`trackContainer ${selectedTrack ? 'selected' : 'not-selected'} ${inPlaylist ? 'inPlaylist' : 'not-inPlaylist'}`} title={inPlaylist ? `This track, ${track.name} is already in the playlist` : track.name} onClick={onClick}>
      <span className="trackName">{track.name} </span> - <span className="trackArtist">{track.artists[0].name}</span>
      <br/>
      <span className="trackPlayedAt">{trackPlayed(played_at)}</span>
    </div>
  )
}
