import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff,
  Clock,
  AlertTriangle,
  Settings,
  User,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSettings } from '../../hooks/useSettings';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useTavusVideo } from '../../hooks/useTavusVideo';
import toast from 'react-hot-toast';

export function VideoConsultation() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { isOnline, isConnectedToSupabase } = useNetworkStatus();
  const {
    isSessionActive,
    sessionData,
    sessionDuration,
    startSession,
    endSession,
    isLoading,
    error: tavusError,
    formatDuration
  } = useTavusVideo();

  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedPersonality, setSelectedPersonality] = useState(settings.ai_personality);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // Default replica ID - this should be configured based on personality
  const getReplicaId = (personality: string) => {
    // These would be actual Tavus replica IDs configured for different personalities
    const replicaMap: Record<string, string> = {
      supportive: 'r89d84ea6160',
      professional: 'r89d84ea6160',
      friendly: 'r665388ec672',
      motivational: 'r665388ec672',
    };
    return replicaMap[personality] || replicaMap.supportive;
  };

  useEffect(() => {
    // Initialize local video stream
    const initializeLocalVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setLocalStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
        toast.error('Unable to access camera/microphone');
      }
    };

    if (!isSessionActive) {
      initializeLocalVideo();
    }

    return () => {
      // Cleanup local stream
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isSessionActive, localStream]);

  const handleStartSession = async () => {
    if (!isOnline) {
      toast.error('Internet connection required for video consultation');
      return;
    }

    if (!isConnectedToSupabase) {
      toast.error('Unable to connect to server');
      return;
    }

    try {
      const replicaId = getReplicaId(selectedPersonality);
      await startSession(replicaId);
      toast.success('Video consultation started!');
    } catch (error) {
      console.error('Failed to start session:', error);
      toast.error('Failed to start video session');
    }
  };

  const handleEndSession = async () => {
    try {
      await endSession();
      toast.success('Video consultation ended');
    } catch (error) {
      console.error('Failed to end session:', error);
      toast.error('Failed to end session properly');
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const personalities = [
    { id: 'supportive', name: 'Supportive & Caring', description: 'Empathetic and understanding' },
    { id: 'professional', name: 'Professional', description: 'Clinical and structured approach' },
    { id: 'friendly', name: 'Friendly & Casual', description: 'Warm and conversational' },
    { id: 'motivational', name: 'Motivational', description: 'Inspiring and encouraging' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Face-to-Face AI Consultation
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Have a personal video conversation with your AI mental health companion
        </p>
      </div>

      {/* Connection Status */}
      {(!isOnline || !isConnectedToSupabase) && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4"
        >
          <div className="flex items-center space-x-3">
            <WifiOff className="h-5 w-5 text-red-600 dark:text-red-400" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-300">Connection Required</p>
              <p className="text-sm text-red-700 dark:text-red-400">
                Video consultation requires a stable internet connection
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Video Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Video Area */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-black rounded-2xl overflow-hidden aspect-video relative"
          >
            {/* AI Video Stream */}
            {isSessionActive && sessionData?.session_url ? (
              <iframe
                src={sessionData.session_url}
                className="w-full h-full"
                allow="camera; microphone"
                title="AI Video Consultation"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 to-blue-900">
                <div className="text-center text-white">
                  <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">AI Companion Ready</p>
                  <p className="text-sm opacity-75">Start a session to begin video consultation</p>
                </div>
              </div>
            )}

            {/* Local Video Preview */}
            <div className="absolute bottom-4 right-4 w-32 h-24 bg-gray-900 rounded-lg overflow-hidden border-2 border-white/20">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
              />
              {!isVideoEnabled && (
                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                  <VideoOff className="h-6 w-6 text-gray-400" />
                </div>
              )}
            </div>

            {/* Session Timer */}
            {isSessionActive && (
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm text-white px-3 py-2 rounded-lg flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span className="font-mono">{formatDuration(sessionDuration)}</span>
              </div>
            )}

            {/* Connection Status Indicator */}
            <div className="absolute top-4 right-4 flex items-center space-x-2">
              {isOnline ? (
                <div className="bg-green-500 w-3 h-3 rounded-full animate-pulse"></div>
              ) : (
                <div className="bg-red-500 w-3 h-3 rounded-full"></div>
              )}
            </div>
          </motion.div>

          {/* Controls */}
          <div className="flex items-center justify-center space-x-4 mt-6">
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full transition-all duration-200 ${
                isVideoEnabled
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
              title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>

            <button
              onClick={toggleAudio}
              className={`p-3 rounded-full transition-all duration-200 ${
                isAudioEnabled
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
              title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
            >
              {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>

            {isSessionActive ? (
              <button
                onClick={handleEndSession}
                disabled={isLoading}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
              >
                <PhoneOff className="h-5 w-5" />
                <span>End Session</span>
              </button>
            ) : (
              <button
                onClick={handleStartSession}
                disabled={isLoading || !isOnline || !isConnectedToSupabase}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:shadow-lg text-white px-6 py-3 rounded-full transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Phone className="h-5 w-5" />
                <span>{isLoading ? 'Starting...' : 'Start Session'}</span>
              </button>
            )}

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-3 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200"
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>AI Personality</span>
            </h3>
            
            <div className="space-y-3">
              {personalities.map((personality) => (
                <label
                  key={personality.id}
                  className={`block p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    selectedPersonality === personality.id
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="personality"
                    value={personality.id}
                    checked={selectedPersonality === personality.id}
                    onChange={(e) => setSelectedPersonality(e.target.value as any)}
                    className="sr-only"
                    disabled={isSessionActive}
                  />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{personality.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{personality.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </motion.div>

          {/* Session Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Session Info</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {isSessionActive ? 'Active' : 'Ready'}
                </span>
              </div>
              
              {isSessionActive && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatDuration(sessionDuration)}
                  </span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Tips */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800"
          >
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-3">Tips for Better Sessions</h3>
            <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-400">
              <li>• Ensure good lighting on your face</li>
              <li>• Use headphones for better audio quality</li>
              <li>• Find a quiet, private space</li>
              <li>• Speak clearly and at normal pace</li>
              <li>• Be open and honest with the AI</li>
            </ul>
          </motion.div>
        </div>
      </div>

      {/* Error Display */}
      {tavusError && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4"
        >
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-300">Session Error</p>
              <p className="text-sm text-red-700 dark:text-red-400">{tavusError}</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}