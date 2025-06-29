import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useNetworkStatus } from './useNetworkStatus';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface TavusSession {
  session_id: string;
  session_url: string;
  conversation_id?: string;
}

interface TavusConfig {
  replica_id: string;
  callback_url?: string;
}

export function useTavusVideo() {
  const { user, handleSupabaseError } = useAuth();
  const { isOnline, withRetry } = useNetworkStatus();
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionData, setSessionData] = useState<TavusSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const tavusApiKey = import.meta.env.VITE_TAVUS_API_KEY;
  const isVideoEnabled = !!tavusApiKey && isOnline;

  // Timer management
  const startTimer = useCallback(() => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
    }
    
    sessionTimerRef.current = setInterval(() => {
      setSessionDuration(prev => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    stopTimer();
    setSessionDuration(0);
  }, [stopTimer]);

  // Local media management
  const startLocalVideo = useCallback(async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      localStreamRef.current = stream;
      return stream;
    } catch (error) {
      console.error('Error accessing local media:', error);
      toast.error('Failed to access camera/microphone');
      return null;
    }
  }, []);

  const stopLocalVideo = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
  }, []);

  // Tavus API calls
  const createSession = useCallback(async (config: TavusConfig): Promise<TavusSession | null> => {
    if (!tavusApiKey) {
      toast.error('Tavus API key not configured');
      return null;
    }

    if (!isOnline) {
      toast.error('Internet connection required for video sessions');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('https://tavusapi.com/v2/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': tavusApiKey,
        },
        body: JSON.stringify({
          replica_id: config.replica_id,
          callback_url: config.callback_url,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Tavus API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      
      const session: TavusSession = {
        session_id: data.conversation_id,
        session_url: data.conversation_url,
        conversation_id: data.conversation_id,
      };

      setSessionData(session);
      return session;
    } catch (error) {
      console.error('Error creating Tavus session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create video session';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [tavusApiKey, isOnline]);

  const startSession = useCallback(async (replicaId: string): Promise<boolean> => {
    if (!user) {
      toast.error('Please sign in to start a video session');
      return false;
    }

    try {
      // Start local video first
      const localStream = await startLocalVideo();
      if (!localStream) {
        return false;
      }

      // Create Tavus session
      const session = await createSession({
        replica_id: replicaId,
      });

      if (!session) {
        stopLocalVideo();
        return false;
      }

      // Store session in database
      if (user) {
        try {
          await withRetry(async () => {
            const { error } = await supabase
              .from('video_sessions')
              .insert([{
                user_id: user.id,
                session_id: session.session_id,
                conversation_id: session.conversation_id,
                session_config: {
                  replica_id: replicaId,
                }
              }]);

            if (error) {
              const isJWTError = await handleSupabaseError(error);
              if (!isJWTError) throw error;
            }
          });
        } catch (error) {
          console.warn('Failed to store session in database:', error);
          // Continue with session even if database storage fails
        }
      }

      setIsSessionActive(true);
      startTimer();
      toast.success('Video session started!');
      return true;
    } catch (error) {
      console.error('Error starting session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start video session';
      setError(errorMessage);
      toast.error(errorMessage);
      stopLocalVideo();
      return false;
    }
  }, [user, createSession, startLocalVideo, stopLocalVideo, startTimer, withRetry, handleSupabaseError]);

  const endSession = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);

      // End Tavus session if active
      if (sessionData?.session_id && tavusApiKey) {
        try {
          await fetch(`https://tavusapi.com/v2/conversations/${sessionData.session_id}/end`, {
            method: 'POST',
            headers: {
              'x-api-key': tavusApiKey,
            },
          });
        } catch (error) {
          console.warn('Failed to end Tavus session:', error);
        }
      }

      // Update database record
      if (user && sessionData?.session_id) {
        try {
          await withRetry(async () => {
            const { error } = await supabase
              .from('video_sessions')
              .update({
                ended_at: new Date().toISOString(),
                duration_seconds: sessionDuration,
              })
              .eq('session_id', sessionData.session_id)
              .eq('user_id', user.id);

            if (error) {
              const isJWTError = await handleSupabaseError(error);
              if (!isJWTError) throw error;
            }
          });
        } catch (error) {
          console.warn('Failed to update session in database:', error);
        }
      }

      // Clean up local resources
      stopLocalVideo();
      stopTimer();
      
      setIsSessionActive(false);
      setSessionData(null);
      setError(null);
      
      toast.success('Video session ended');
    } catch (error) {
      console.error('Error ending session:', error);
      toast.error('Failed to properly end session');
    } finally {
      setIsLoading(false);
    }
  }, [sessionData, tavusApiKey, user, sessionDuration, stopLocalVideo, stopTimer, withRetry, handleSupabaseError]);

  const toggleVideo = useCallback(async (enabled: boolean) => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = enabled;
      }
    }
  }, []);

  const toggleAudio = useCallback(async (enabled: boolean) => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = enabled;
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLocalVideo();
      stopTimer();
    };
  }, [stopLocalVideo, stopTimer]);

  // Format session duration for display
  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    // State
    isSessionActive,
    sessionData,
    isLoading,
    sessionDuration,
    error,
    isVideoEnabled,
    
    // Actions
    startSession,
    endSession,
    toggleVideo,
    toggleAudio,
    
    // Refs
    videoRef,
    localStreamRef,
    
    // Utilities
    formatDuration,
    resetTimer,
  };
}