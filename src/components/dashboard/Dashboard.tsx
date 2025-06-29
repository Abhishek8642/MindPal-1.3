import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckSquare, 
  Heart, 
  Mic, 
  Brain,
  TrendingUp,
  Target,
  Award,
  ExternalLink,
  WifiOff,
  AlertTriangle,
  Sparkles,
  Calendar,
  Clock,
  Zap
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export function Dashboard() {
  const { user, handleSupabaseError } = useAuth();
  const { isOnline, isConnectedToSupabase, withRetry } = useNetworkStatus();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    todayMood: null as number | null,
    voiceSessions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!user) return;

    if (!isConnectedToSupabase) {
      setLoading(false);
      setError('No connection to server');
      return;
    }

    try {
      setError(null);
      
      // Get task stats with retry
      const taskData = await withRetry(async () => {
        const { data, error } = await supabase
          .from('tasks')
          .select('completed')
          .eq('user_id', user.id);

        if (error) {
          const isJWTError = await handleSupabaseError(error);
          if (!isJWTError) throw error;
          return null;
        }

        return data;
      });

      // Get today's mood with retry
      const today = new Date().toISOString().split('T')[0];
      const moodData = await withRetry(async () => {
        const { data, error } = await supabase
          .from('mood_entries')
          .select('mood')
          .eq('user_id', user.id)
          .gte('created_at', today)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          const isJWTError = await handleSupabaseError(error);
          if (!isJWTError) throw error;
          return null;
        }

        return data;
      });

      // Get voice sessions count with retry
      const voiceData = await withRetry(async () => {
        const { data, error } = await supabase
          .from('chat_sessions')
          .select('id')
          .eq('user_id', user.id);

        if (error) {
          const isJWTError = await handleSupabaseError(error);
          if (!isJWTError) throw error;
          return null;
        }

        return data;
      });

      setStats({
        totalTasks: taskData?.length || 0,
        completedTasks: taskData?.filter(task => task.completed).length || 0,
        todayMood: moodData?.[0]?.mood || null,
        voiceSessions: voiceData?.length || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      setError('Failed to load dashboard data');
      if (isConnectedToSupabase) {
        toast.error('Failed to load dashboard stats');
      }
    } finally {
      setLoading(false);
    }
  }, [user, handleSupabaseError, withRetry, isConnectedToSupabase]);

  useEffect(() => {
    if (user) {
      loadStats();
    } else {
      setLoading(false);
    }
  }, [user, loadStats]);

  const handleQuickAction = async (action: string) => {
    try {
      switch (action) {
        case 'voice':
          navigate('/voice');
          break;
        case 'mood':
          navigate('/mood');
          break;
        case 'task':
          navigate('/tasks');
          break;
        case 'retry-connection':
          setLoading(true);
          await loadStats();
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error handling quick action:', error);
      toast.error('Failed to perform action');
    }
  };

  const completionRate = stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0;

  const statCards = [
    {
      title: 'Tasks Completed',
      value: `${stats.completedTasks}/${stats.totalTasks}`,
      subtitle: `${Math.round(completionRate)}% completion rate`,
      icon: CheckSquare,
      gradient: 'from-emerald-400 via-green-500 to-teal-600',
      bgGradient: 'from-emerald-50 to-green-100',
      iconBg: 'from-emerald-500 to-green-600',
    },
    {
      title: "Today's Mood",
      value: stats.todayMood ? `${stats.todayMood}/10` : 'Not logged',
      subtitle: stats.todayMood ? 'Feeling great!' : 'Log your mood',
      icon: Heart,
      gradient: 'from-pink-400 via-rose-500 to-red-500',
      bgGradient: 'from-pink-50 to-rose-100',
      iconBg: 'from-pink-500 to-rose-600',
    },
    {
      title: 'Chat Sessions',
      value: stats.voiceSessions.toString(),
      subtitle: 'AI conversations',
      icon: Mic,
      gradient: 'from-purple-400 via-violet-500 to-indigo-600',
      bgGradient: 'from-purple-50 to-violet-100',
      iconBg: 'from-purple-500 to-violet-600',
    },
    {
      title: 'Streak',
      value: '7 days',
      subtitle: 'Keep it up!',
      icon: Award,
      gradient: 'from-amber-400 via-orange-500 to-red-500',
      bgGradient: 'from-amber-50 to-orange-100',
      iconBg: 'from-amber-500 to-orange-600',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, {user?.email?.split('@')[0]}!
          </h1>
          <p className="text-white/80 text-lg">
            {format(new Date(), 'EEEE, MMMM do, yyyy')}
          </p>
        </motion.div>
        
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-white/80 text-sm mb-4"
        >
          <Sparkles className="h-4 w-4" />
          <span>Your AI-powered wellness companion</span>
        </motion.div>
        <h1 className="text-5xl font-bold text-white mb-2">
          Welcome back, <span className="text-gradient-secondary">{user?.email?.split('@')[0]}</span>!
        </h1>
        <p className="text-white/80 text-xl flex items-center justify-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>{format(new Date(), 'EEEE, MMMM do, yyyy')}</span>
        </p>
      </motion.div>

      {/* Connection Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card bg-red-50 border-red-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {!isOnline ? (
                <WifiOff className="h-5 w-5 text-red-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              <div>
                <p className="font-medium text-red-800">Connection Issues</p>
                <p className="text-sm text-red-700">
                  {error} - Some features may not work properly
                </p>
              </div>
            </div>
            <button
              onClick={() => handleQuickAction('retry-connection')}
              className="btn btn-secondary text-red-600 border-red-200 hover:bg-red-50"
            >
              Retry
            </button>
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`card card-hover bg-gradient-to-br ${card.bgGradient} border-0 ${
                error ? 'opacity-75' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`bg-gradient-to-r ${card.iconBg} p-3 rounded-xl shadow-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <TrendingUp className="h-4 w-4 text-gray-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-500">{card.subtitle}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="card"
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-2 rounded-xl">
            <Target className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Quick Actions</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleQuickAction('voice')}
            className="bg-gradient-to-r from-purple-500 via-violet-600 to-indigo-600 text-white p-6 rounded-2xl hover:shadow-2xl transition-all duration-300 text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <Mic className="h-8 w-8 group-hover:scale-110 transition-transform duration-300" />
              <Zap className="h-5 w-5 opacity-60" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Voice Chat</h3>
            <p className="text-sm opacity-90">Talk to your AI companion</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleQuickAction('mood')}
            className="bg-gradient-to-r from-pink-500 via-rose-600 to-red-500 text-white p-6 rounded-2xl hover:shadow-2xl transition-all duration-300 text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <Heart className="h-8 w-8 group-hover:scale-110 transition-transform duration-300" />
              <Clock className="h-5 w-5 opacity-60" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Mood Check</h3>
            <p className="text-sm opacity-90">Log your emotions</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleQuickAction('task')}
            className="bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 text-white p-6 rounded-2xl hover:shadow-2xl transition-all duration-300 text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <CheckSquare className="h-8 w-8 group-hover:scale-110 transition-transform duration-300" />
              <Target className="h-5 w-5 opacity-60" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Add Task</h3>
            <p className="text-sm opacity-90">Create a new reminder</p>
          </motion.button>
        </div>
      </motion.div>

      {/* Built on Bolt Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="flex justify-center"
      >
        <motion.a
          href="https://bolt.new"
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-full text-sm font-medium hover:shadow-2xl transition-all duration-300"
        >
          <Brain className="h-4 w-4" />
          <span>Built on Bolt</span>
          <ExternalLink className="h-3 w-3" />
        </motion.a>
      </motion.div>
    </div>
  );
}