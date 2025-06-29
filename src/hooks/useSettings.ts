import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useNetworkStatus } from './useNetworkStatus';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export interface UserSettings {
  language: string;
  voice_speed: 'slow' | 'normal' | 'fast';
  ai_personality: 'supportive' | 'professional' | 'friendly' | 'motivational';
  data_sharing: boolean;
  analytics: boolean;
  voice_recordings: boolean;
}

const defaultSettings: UserSettings = {
  language: 'en',
  voice_speed: 'normal',
  ai_personality: 'supportive',
  data_sharing: false,
  analytics: true,
  voice_recordings: true,
};

export function useSettings() {
  const { user, handleSupabaseError } = useAuth();
  const { withRetry, isConnectedToSupabase } = useNetworkStatus();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingDefaults, setCreatingDefaults] = useState(false);

  const loadSettings = useCallback(async () => {
    if (loading) {
      console.warn('Settings load already in progress, skipping.');
      return;
    }
    console.log('Loading settings from Supabase...', { user, isConnectedToSupabase });
    if (!user) {
      setLoading(false);
      return;
    }

    if (!isConnectedToSupabase) {
      setLoading(false);
      return;
    }

    try {
      const data = await withRetry(async () => {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          const isJWTError = await handleSupabaseError(error);
          if (!isJWTError) throw error;
          return null;
        }

        return data;
      });

      if (data) {
        const loadedSettings: UserSettings = {
          language: data.language || 'en',
          voice_speed: data.voice_speed || 'normal',
          ai_personality: data.ai_personality || 'supportive',
          data_sharing: data.data_sharing ?? false,
          analytics: data.analytics ?? true,
          voice_recordings: data.voice_recordings ?? true,
        };
        setSettings(loadedSettings);
      } else {
        // Create default settings if they don't exist and we're not already creating them
        if (!creatingDefaults && !saving) {
          await createDefaultSettings();
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      if (isConnectedToSupabase) {
        toast.error('Failed to load settings');
      }
    } finally {
      setLoading(false);
    }
  }, [user, handleSupabaseError, creatingDefaults, saving, withRetry, isConnectedToSupabase]);

  const createDefaultSettings = async () => {
    if (!user || creatingDefaults || !isConnectedToSupabase) return;

    try {
      setCreatingDefaults(true);
      
      await withRetry(async () => {
        const { error } = await supabase
          .from('user_settings')
          .upsert([{ 
            user_id: user.id, 
            ...defaultSettings 
          }], {
            onConflict: 'user_id'
          });

        if (error) {
          const isJWTError = await handleSupabaseError(error);
          if (!isJWTError) throw error;
          return;
        }
      });
      
      setSettings(defaultSettings);
    } catch (error) {
      console.error('Error creating default settings:', error);
      if (isConnectedToSupabase) {
        toast.error('Failed to create default settings');
      }
    } finally {
      setCreatingDefaults(false);
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user) {
      toast.error('Please sign in to save settings');
      return;
    }

    if (!isConnectedToSupabase) {
      toast.error('Cannot save settings - no connection to server');
      return;
    }

    try {
      setSaving(true);
      const updatedSettings = { ...settings, ...newSettings };
      
      await withRetry(async () => {
        const { error } = await supabase
          .from('user_settings')
          .upsert([{ 
            user_id: user.id, 
            ...updatedSettings,
            updated_at: new Date().toISOString()
          }], {
            onConflict: 'user_id'
          });

        if (error) {
          const isJWTError = await handleSupabaseError(error);
          if (!isJWTError) throw error;
          return;
        }
      });

      setSettings(updatedSettings);
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    console.log('useSettings useEffect triggered', { user });
    if (user) {
      loadSettings();
    } else {
      setLoading(false);
    }
  }, [user]);

  return {
    settings,
    loading,
    saving,
    updateSettings,
  };
}