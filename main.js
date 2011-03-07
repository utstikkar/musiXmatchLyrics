/**************************************************************************
*   Amarok 2 lyrics script to fetch lyrics from musiXmatch.com            *
*   Based on the Lyricwiki plugin written by Aaron Reichman               *
*                                                                         *
*   Copyright                                                             *
*   (C) 2011 Amélie Anglade <amelie.anglade@gmail.com>                    *
*   (C) 2011 Benoît Bleuzé <benoit.bleuze@gmail.com>                      *
*                                                                         *
*   This program is free software; you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation; either version 2 of the License, or     *
*   (at your option) any later version.                                   *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program; if not, write to the                         *
*   Free Software Foundation, Inc.,                                       *
*   51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.         *
**************************************************************************/

Importer.loadQtBinding( "qt.core" );
Importer.loadQtBinding( "qt.xml" );

/* GLOBAL VARIABLES */
// template for the xml object that will be populated and passed to Amarok.Lyrics.showLyrics()
XML = "<?xml version=\"1.0\" encoding=\"UTF-8\" ?><lyric artist=\"{artist}\" title=\"{title}\">{lyrics}</lyric>";
//template for suggestions
XMLSUGGESTION = "";
// if we change variable xml it will not reinitialized on next lyrics request, so we will get lyrics from previous song
// because of that we need temp variable
NEWXML = "";
// maximum numbers that we can follow by #REDIRECT [[Band:Song]]
MAXREDIRECTS = 3;
// url to get lyrics using musixmatch API and API key
APIKEY = "YOUR KEY HERE";
APIURL = "http://api.musixmatch.com/ws/1.1/";

// urlified artist and title will be here after initialization
ARTIST = "";
TITLE  = "";
// the error message that is displayed if no lyrics were found or there was an error while trying to fetch them
ERRORMSG = "Lyrics not found. Sorry.";
XMLNOTFOUND="<suggestions page_url=\"http://musixmatch.com\"></suggestions>"


/* receives a json message from musixmatch from a track id */
function onLyricsReceived( response, redirects )
{
    try
    {
        if( response.length == 0 )
            Amarok.Lyrics.showLyricsError( "Unable to contact server - no website returned" ); 
        else
        {
            Amarok.debug("we have a valid response:" + response);
            var resp_obj = eval('(' + response + ')');
            var lyrics = resp_obj.message.body.lyrics;
            Amarok.debug("lyrics:" +lyrics);
            //test length of trackList
            if( lyrics.length == 0)
            {
               Amarok.Lyrics.showLyrics(XMLNOTFOUND); 
            }
            else 
            {
                //lyrics found
                var lyrics_body = lyrics.lyrics_body.replace(/\n/g,"<br/>");
                var end_result = "<html><body>"+lyrics_body+"<br/><pre>"+lyrics.lyrics_copyright +
                 //"<img src=\""+lyrics.pixel_tracking_url + "\"/></body></html>";
                "</pre><script type=\"text/javascript\" src=\""+
                lyrics.script_tracking_url+"\"></script> </body></html>";
                Amarok.debug("end result-------------------------------\n\n\n---------------"+
                    end_result);
                Amarok.Lyrics.showLyricsHtml(end_result);
            }    
        }
    }
    catch (err){
        Amarok.debug ( "script error in function onLyricsReceived: " + err );
    } 

}


/* receives a json message from musixmatch for a track search */
function onSearchReceived( response, redirects )
{
    try
    {
        if( response.length == 0 )
            Amarok.Lyrics.showLyricsError( "Unable to contact server - no website returned" ); // TODO: this should be i18n able
        else
        {
            Amarok.debug("we have a valid response:" + response);
            var resp_obj = eval('(' + response + ')');
            var trackList = resp_obj.message.body.track_list;
            Amarok.debug("trackList:" +trackList);
            //test length of trackList
            var trackListLength = trackList.length

            if( trackListLength == 0)
            {
               Amarok.Lyrics.showLyrics(XMLNOTFOUND); 
            }
            else if( trackListLength == 1 )
            {
                //track found!
                var url = QUrl.fromEncoded( new QByteArray( APIURL + "track.lyrics.get?apikey=" +
                         APIKEY + "&track_id=" + trackList[0].track.track_id + "&format=json" ), 1);
                Amarok.debug( "request URL: " + url.toString() );
                new Downloader( url, new Function("response", "onLyricsReceived(response, -1)") );
            }
            else
            {
                Amarok.debug("multiple suggestions");
                var xmlSuggestion = "<suggestions page_url=\"http://musixmatch.com\">";
                for (track_index=0;track_index<trackListLength;track_index++)
                {
                    xmlSuggestion = xmlSuggestion +"\n<suggestion artist=\"" +
                    trackList[track_index].track.artist_name + "\" title=\""+ 
                    trackList[track_index].track.track_name + "\" url=\""+
                    trackList[track_index].track.track_id+"\"/>";
                }
                xmlSuggestion = xmlSuggestion + "</suggestions>";
                Amarok.Lyrics.showLyrics(xmlSuggestion);
            }    
           }
    }
    catch( err )
    {
        Amarok.Lyrics.showLyricsError( ERRORMSG );
        Amarok.debug( "script error in function onLyricsReceived: " + err );
    }
}

// build a URL component out of a string containing an artist or a song title
function URLify( string ) {
    try {
        // replace (erroneously used) accent ` with a proper apostrophe '
        string = string.replace( "`", "'" );
        // split into words, then treat each word separately
        var words = string.split( " " );
        for ( var i = 0; i < words.length; i++ ) {
            var upper = 1; // normally, convert first character only to uppercase, but:
            // if we have a Roman numeral (well, at least either of "ii", "iii"), convert all "i"s
            if ( words[i].charAt(0).toUpperCase() == "I" ) {
                // count "i" letters 
                while ( words[i].length > upper && words[i].charAt(upper).toUpperCase() == "I" ) {
                    upper++;
                }
            }
            // if the word starts with an apostrophe or parenthesis, the next character has to be uppercase
            if ( words[i].charAt(0) == "'" || words[i].charAt(0) == "(" ) {
                upper++;
            }
            // finally, perform the capitalization
            if ( upper < words[i].length ) {
                words[i] = words[i].substring( 0, upper ).toUpperCase() + words[i].substring( upper );
            } else {
                words[i] = words[i].toUpperCase();
            }
            // now take care of more special cases
            // names like "McSomething"
            if ( words[i].substring( 0, 2 ) == "Mc" ) {
                words[i] = "Mc" + words[i][2].toUpperCase() + words[i].substring( 3 );
            }
            // URI-encode the word
            words[i] = encodeURIComponent( words[i] );
        } 
        // join the words back together and return the result
        var result = words.join( "%20" );
        return result;
    } catch ( err ) {
        Amarok.debug ( "script error in function URLify: " + err );
    } 
}

// convert all HTML entities to their applicable characters
function entityDecode(string)
{
    try
    {
        var convertxml = "<?xml version=\"1.0\" encoding=\"UTF-8\" ?><body><entity>" + string + "</entity></body>";
        var doc = new QDomDocument();
        if(doc.setContent(convertxml))
        { // xml is valid
            return doc.elementsByTagName( "entity" ).at( 0 ).toElement().text();
        }
        
        return string;
    }
    catch( err )
    {
        Amarok.debug( "script error in function entityDecode: " + err );
    }
}

// entry point
function getLyrics( artist, title, url )
{
    try
    {   
        if (url == "")
        {
            // save artist and title for later display now
            NEWXML = XML.replace( "{artist}", Amarok.Lyrics.escape( artist ) );
            NEWXML = NEWXML.replace( "{title}", Amarok.Lyrics.escape( title ) );
        
            // strip "featuring <someone else>" from the artist
            var strip = artist.toLowerCase().indexOf( " ft. ");
            if ( strip != -1 ) {
                artist = artist.substring( 0, strip );
            }
            strip = artist.toLowerCase().indexOf( " feat. " );
            if ( strip != -1 ) {
                artist = artist.substring( 0, strip );
            }
            strip = artist.toLowerCase().indexOf( " featuring " );
            if ( strip != -1 ) {
                artist = artist.substring( 0, strip );
            }
        
            // URLify artist and title
            ARTIST = artist = URLify( entityDecode(artist) );
            TITLE  = title  = URLify( entityDecode(title) );

            // assemble the (encoded!) URL, build a QUrl out of it and dispatch the download request
            var url = QUrl.fromEncoded( new QByteArray( APIURL + "track.search?apikey=" + APIKEY + 
                    "&q_artist=" + artist + "&q_track=:" + 
                    title + "&format=json&f_has_lyrics=1" ), 1);
            Amarok.debug( "request URL: " + url.toString() );
            // there was no redirections yet
            new Downloader( url, new Function("response", "onSearchReceived(response, -1)") );
        }
        else 
        {
            //url is a track id from musixmatch
             var url1 = QUrl.fromEncoded( new QByteArray( APIURL + "track.lyrics.get?apikey=" +
                         APIKEY + "&track_id=" + url + "&format=json" ), 1);
                Amarok.debug( "request URL: " + url1.toString() );
                new Downloader( url1, new Function("response", "onLyricsReceived(response, -1)") );

        }
            
    }
    catch( err )
    {
        Amarok.debug( "error: " + err );
    }
       
}


Amarok.Lyrics.fetchLyrics.connect( getLyrics );
