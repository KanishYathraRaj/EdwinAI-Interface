import { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <GraduationCap className="w-10 h-10 text-blue-500 mr-3" />
          <h1 className="text-3xl font-bold text-white">EdwinAI</h1>
        </div>

        <div className="bg-zinc-900 rounded-xl p-8 shadow-2xl">
          <div className="flex gap-2 mb-6 bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                mode === 'login'
                  ? 'bg-zinc-700 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                mode === 'register'
                  ? 'bg-zinc-700 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          {mode === 'login' ? <LoginForm /> : <RegisterForm />}
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          AI-powered teaching assistant for modern educators
        </p>
      </div>
    </div>
  );
}
