//require the ATT api
var attAPIs = require('att');
var utterance = require('bencoding.utterance');
var speech = utterance.createSpeech();
 Ti.Media.appMusicPlayer = Titanium.Media.MusicPlayer; 
 Ti.Media.appMusicPlayer.setVolume(1.0);

var accessKey = Ti.App.Properties.getString('ATTaccessKey');
var secretKey = Ti.App.Properties.getString('ATTsecretKey');
var scope = Ti.App.Properties.getString('ATTscope');
var grantType = 'client_credentials';
var ehowapi = 'http://www.ehow.com';
var dataendpoint = 'http://vf.ehowdev.com/services/data/api/';
Titanium.Media.audioSessionMode = Ti.Media.AUDIO_SESSION_MODE_PLAY_AND_RECORD;
var recording = Ti.Media.createAudioRecorder();
recording.compression = Ti.Media.AUDIO_FORMAT_ULAW;
recording.format = Ti.Media.AUDIO_FILEFORMAT_WAVE;

attAPIs.ATT.authorize(accessKey, secretKey, scope, grantType);
$.index.open();
recording.start();
recording.stop();

var listening = false;

function openArticle(article_id){
	var url = dataendpoint + article_id;
	var httpClient = Ti.Network.createHTTPClient({
					    onload : function(e) {
							Titanium.Media.audioSessionMode = Ti.Media.AUDIO_SESSION_MODE_PLAYBACK;
					    	$.MicroAI.hide();
					        Ti.API.info("Received text: " + this.responseText);
					        data = JSON.parse(this.responseText);
					        if( data.title ){
					    		$.Question.setText(data.title);
					    	}
					        articlecontent = data.summary;
					        if( data.sections ){
					        	for( var section in data.sections ){
					        		for( var step in section.steps ){
					        			articlecontent = articlecontent + step.content;
					        		}
					        	}
					        }
					        speech.startSpeaking({
						        text:articlecontent,
						        rate: 0.2,
						        volume: 1
						    }); 
					    },
					    onerror : function(e) {
					    	$.MicroAI.hide();
					        Ti.API.info("Error: " + e.error);
					        alert('error');
					    },
					    timeout : 5000,
					    // this property must be set to true
					    // unless you are using a custom SSLContext
					});
		httpClient.open("GET", url);
		httpClient.send();
}

$.Microphone.addEventListener('click',function(){
	newheight = Ti.Platform.displayCaps.platformHeight;
	speech.stopSpeaking();
	if( ! listening ){
			$.Question.setText('Ask Ehow Anything!');
		Titanium.Media.audioSessionMode = Ti.Media.AUDIO_SESSION_MODE_PLAY_AND_RECORD;
		$.MicroAI.show();
		recording.start();
		//animate the button
		$.Microphone.animate({
			width: Ti.UI.FILL,
    		height:newheight+100,
    		borderRadius:0,
    		bottom:-50,
			backgroundColor: '#FDF5F5'
		});
		$.MicrophoneIcon.animate({
			bottom: 70
		});
		if (!Ti.Media.canRecord) {
			$.MicroAI.hide();
			Ti.UI.createAlertDialog({
				title : 'Error!',
				message : 'No audio recording hardware is currently connected.'
			}).show();
			return;
		}
		$.MicroAI.hide();
		listening = true;
	}else{
		listening = false;
		$.MicroAI.show();
		file = recording.stop();
		var tempFile = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory, 'temp.wav');
		tempFile.write(file);
		attAPIs.ATT.Speech.speechToText({
	          'filePath':tempFile.path,//'testvoice.wav',//
	          'xSpeechContext' : 'Generic',
	          'contentType' : 'audio/wav',
	          'accept':'application/json',
	          'contentLanguage': 'en-US'
	      }, function(data) {
	      	   data = JSON.parse(data);
	      	   if( data.Recognition.Status == 'OK' ){
	      	   	    $.Question.setText('"' + data.Recognition.NBest[0].ResultText + '"');
	      	   		var url = ehowapi + "/services/modules/search/m/0?s=" + data.Recognition.NBest[0].ResultText;
					var httpClient = Ti.Network.createHTTPClient({
					    onload : function(e) {
					        Ti.API.info("Received text: " + this.responseText);
					        result = this.responseText.substring( this.responseText.indexOf( ehowapi ) );
					        result = result.substring( 0 , result.indexOf( '"' ) );
					        result_id = result.replace( ehowapi, '');
					        if( ! result ){
					        	$.MicroAI.hide();
					        	alert('no result found');
					        }else{
					        	openArticle(result_id);
								//Ti.Platform.openURL(result);					        	
					        }
					    },
					    onerror : function(e) {
					        Ti.API.info("Error: " + e.error);
					        alert('error');
					    },
					    timeout : 5000,
					    // this property must be set to true
					    // unless you are using a custom SSLContext
					});
					httpClient.open("GET", url);
					httpClient.send();
	      	   }else{
	      	   		$.MicroAI.hide();
	      	   	 alert('Could not understand');
	      	   }
	      	   tempFile.deleteFile();
	          //success Callback
	      }, function(error) {
	      		$.MicroAI.hide();
				alert('Could not understand');
				tempFile.deleteFile();
	          //error Callback
	
	      });
		Ti.Media.stopMicrophoneMonitor();
		$.MicrophoneIcon.animate({
			bottom: 5
		});
		$.Microphone.animate({
			bottom: '120dp',
			borderRadius:50,
			height: '100dp',
			width: '100dp',
			backgroundColor: '#ddd',
			opacity: '.9',
			backgroundColor: '#FDF5F5'
		});
	}
});