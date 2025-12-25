import { useState, useEffect } from 'react';
import { Download, Upload } from 'lucide-react';
import { Question } from '../../types';
import { supabase } from '../../lib/supabase';

interface QuestionBankViewProps {
  subjectId: string;
  subjectTitle: string;
}

interface QuestionsByMarks {
  [marks: number]: Question[];
}

export function QuestionBankView({ subjectId, subjectTitle }: QuestionBankViewProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuestions();
  }, [subjectId]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('subject_id', subjectId)
        .order('marks', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setQuestions(data || []);
    } catch (err) {
      console.error('Error loading questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const groupByMarks = (questions: Question[]): QuestionsByMarks => {
    return questions.reduce((acc, question) => {
      if (!acc[question.marks]) {
        acc[question.marks] = [];
      }
      acc[question.marks].push(question);
      return acc;
    }, {} as QuestionsByMarks);
  };

  const handleDownload = () => {
    const questionsByMarks = groupByMarks(questions);
    let content = `${subjectTitle.toUpperCase()}\nQuestion Bank\n\n`;

    Object.entries(questionsByMarks)
      .sort(([a], [b]) => Number(a) - Number(b))
      .forEach(([marks, qs]) => {
        content += `\n${marks} Marks Questions\n\n`;
        qs.forEach((q, idx) => {
          content += `${idx + 1}. ${q.question_text}\n\n`;
        });
      });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${subjectTitle}_question_bank.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading questions...</p>
      </div>
    );
  }

  const questionsByMarks = groupByMarks(questions);
  const markGroups = Object.entries(questionsByMarks).sort(([a], [b]) => Number(a) - Number(b));

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">{subjectTitle.toUpperCase()}</h2>
          {questions.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-sm">
                <Upload className="w-4 h-4" />
                Upload to GCR
              </button>
            </div>
          )}
        </div>

        {questions.length === 0 ? (
          <div className="flex items-center justify-center h-64 bg-zinc-900 rounded-lg">
            <div className="text-center">
              <p className="text-gray-500 mb-2">No questions generated yet</p>
              <p className="text-sm text-gray-600">
                Use the chat to generate questions based on your syllabus
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {markGroups.map(([marks, qs]) => (
              <div key={marks} className="bg-zinc-900 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  {marks} Marks Questions
                </h3>
                <ol className="space-y-4 list-decimal list-inside">
                  {qs.map((question) => (
                    <li key={question.id} className="text-gray-300 text-sm leading-relaxed">
                      {question.question_text}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
