import React from 'react';
import Link from 'next/link';
import { getExams, getMockTests } from '@/lib/services/testService';
import { ExamCard } from '@/components/exams/ExamCard';
import { TestCard } from '@/components/tests/TestCard';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  ShieldCheck,
  Clock,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Zap,
  Target
} from 'lucide-react';

export default async function HomePage() {
  const exams = await getExams();
  const mockTests = await getMockTests();

  const features = [
    {
      icon: Clock,
      title: 'Real Exam Experience',
      description: 'Realistic TCS iON interface with countdown sectional timers, question palette, and authentic marking schemes.',
      color: 'blue'
    },
    {
      icon: BarChart3,
      title: 'Detailed Performance Analysis',
      description: 'Get instant scorecards, accuracy %, section-wise breakdown, and cut-off benchmarks right after submission.',
      color: 'green'
    },
    {
      icon: BookOpen,
      title: 'Topic-wise Practice',
      description: 'Master Quantitative Aptitude, Reasoning Ability, English, and Financial Awareness with step-by-step solutions.',
      color: 'amber'
    },
    {
      icon: Target,
      title: 'Previous Year Questions',
      description: 'High-frequency practice questions patterned after recent IBPS PO and SBI Clerk prelims & mains exams.',
      color: 'purple'
    }
  ];

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50/80 via-white to-slate-50 pt-16 pb-20 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Updated for 2024-2025 IBPS & SBI Exam Cycles
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Crack Banking Exams with{' '}
                <span className="text-blue-600 underline decoration-blue-200 underline-offset-8">
                  Smarter Practice
                </span>
              </h1>

              <p className="text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Take real exam-like mock tests for <strong className="text-slate-800">IBPS PO</strong> and{' '}
                <strong className="text-slate-800">SBI Clerk</strong>. Track accuracy, boost your speed, and review detailed step-by-step explanations.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
                <Link href="/tests">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto shadow-md">
                    Start a Mock Test
                    <ArrowRight className="w-5 h-5 ml-1" />
                  </Button>
                </Link>
                <Link href="/exams">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Explore Exams
                  </Button>
                </Link>
              </div>

              {/* Key Trust Highlights */}
              <div className="grid grid-cols-3 gap-4 pt-6 max-w-lg mx-auto lg:mx-0 border-t border-slate-200 text-left">
                <div>
                  <span className="text-2xl font-extrabold text-slate-900 block">100%</span>
                  <span className="text-xs text-slate-500 font-medium">Exam Standard</span>
                </div>
                <div>
                  <span className="text-2xl font-extrabold text-slate-900 block">+1 / -0.25</span>
                  <span className="text-xs text-slate-500 font-medium">Negative Marking</span>
                </div>
                <div>
                  <span className="text-2xl font-extrabold text-slate-900 block">Instant</span>
                  <span className="text-xs text-slate-500 font-medium">Solutions & Analytics</span>
                </div>
              </div>
            </div>

            {/* Right Hero Feature Card */}
            <div className="lg:col-span-5">
              <Card className="border-2 border-blue-100 shadow-xl bg-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">IBPS PO Prelims Live Test</h4>
                        <span className="text-xs text-slate-500">60 Minutes • 100 Marks</span>
                      </div>
                    </div>
                    <Badge variant="green" size="sm">Active Test</Badge>
                  </div>

                  <div className="space-y-3 text-xs text-slate-700">
                    <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg">
                      <span>English Language</span>
                      <span className="font-semibold text-blue-700">30 Qs (20 mins)</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg">
                      <span>Quantitative Aptitude</span>
                      <span className="font-semibold text-blue-700">35 Qs (20 mins)</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg">
                      <span>Reasoning Ability</span>
                      <span className="font-semibold text-blue-700">35 Qs (20 mins)</span>
                    </div>
                  </div>

                  <Link href="/test/mock-ibps-po-1">
                    <Button variant="primary" size="md" className="w-full justify-center mt-2 shadow-xs">
                      <Zap className="w-4 h-4 mr-1.5" /> Try Featured Mock Test Now
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Target Exams Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <Badge variant="blue" size="sm" className="mb-2">Target Exams</Badge>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Select Your Target Banking Exam
            </h2>
            <p className="text-slate-600 text-sm mt-1">
              Structured mock test series designed according to official IBPS and SBI exam specifications.
            </p>
          </div>
          <Link href="/exams">
            <Button variant="outline" size="sm">View All Exams</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {exams.map((exam) => (
            <ExamCard key={exam.id} exam={exam} />
          ))}

          {/* Coming Soon Card */}
          <Card className="border border-dashed border-slate-300 bg-slate-50/50 flex flex-col justify-center items-center text-center p-8">
            <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">More Exams Coming Soon</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              RBI Grade B, IBPS RRB Officer Scale 1, and NABARD Assistant test series currently in preparation.
            </p>
            <Badge variant="slate" size="sm" className="mt-4">
              Under Development
            </Badge>
          </Card>
        </div>
      </section>

      {/* Platform Features Section */}
      <section className="bg-white py-16 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <Badge variant="blue" size="sm">Why BankMock</Badge>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Engineered for Serious Banking Aspirants
            </h2>
            <p className="text-slate-600 text-base">
              Every tool and metric you need to transition from preparation to final selection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <Card key={i} className="border border-slate-200 shadow-xs">
                  <CardContent className="p-6 space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{f.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{f.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Mock Tests Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <Badge variant="blue" size="sm" className="mb-2">Full Length Tests</Badge>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Available Mock Tests
            </h2>
            <p className="text-slate-600 text-sm mt-1">
              Start practicing now with instant scoring and question solution reviews.
            </p>
          </div>
          <Link href="/tests">
            <Button variant="outline" size="sm">View All Mock Tests</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mockTests.slice(0, 4).map((test) => (
            <TestCard key={test.id} test={test} />
          ))}
        </div>
      </section>

      {/* Final Call To Action Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-blue-600 rounded-2xl p-8 sm:p-12 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center md:text-left max-w-xl">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Ready to test your actual exam readiness?
            </h2>
            <p className="text-blue-100 text-sm leading-relaxed">
              Experience authentic TCS iON test conditions with real-time sectional timing and instant performance analysis.
            </p>
          </div>
          <Link href="/tests">
            <Button variant="secondary" size="lg" className="shrink-0 bg-white text-blue-700 hover:bg-blue-50 font-bold px-8 shadow-md">
              Start Free Mock Test Now
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
