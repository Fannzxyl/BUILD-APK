import React from 'react';
import { BuildStatus } from '../types';
import { GitBranch, Package, Smartphone, Check, FileCode, Layers } from 'lucide-react';

interface StatusStepsProps {
  currentStatus: BuildStatus;
}

export const StatusSteps: React.FC<StatusStepsProps> = ({ currentStatus }) => {
  const steps = [
    { id: BuildStatus.CLONING, label: 'Cloning', icon: GitBranch },
    { id: BuildStatus.INSTALLING, label: 'Dependencies', icon: Package },
    { id: BuildStatus.BUILDING_WEB, label: 'Web Build', icon: FileCode },
    { id: BuildStatus.CAPACITOR_INIT, label: 'Capacitor', icon: Smartphone },
    { id: BuildStatus.COMPILING_APK, label: 'Gradle', icon: Layers },
  ];

  const getStepState = (stepId: BuildStatus) => {
    const statusOrder = [
      BuildStatus.IDLE,
      BuildStatus.CLONING,
      BuildStatus.INSTALLING,
      BuildStatus.BUILDING_WEB,
      BuildStatus.CAPACITOR_INIT,
      BuildStatus.ANDROID_SYNC,
      BuildStatus.COMPILING_APK,
      BuildStatus.SUCCESS,
    ];

    const currentIndex = statusOrder.indexOf(currentStatus);
    const stepIndex = statusOrder.indexOf(stepId);

    if (currentStatus === BuildStatus.ERROR) return 'error';
    if (currentStatus === BuildStatus.SUCCESS) return 'completed';
    if (currentIndex > stepIndex) return 'completed';
    if (currentIndex === stepIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      <div className="flex justify-between relative">
        {/* Connector Line */}
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-zinc-800 -z-10 -translate-y-1/2 rounded"></div>

        {steps.map((step) => {
          const state = getStepState(step.id);
          const Icon = step.icon;

          let circleClass = "bg-zinc-900 border-zinc-700 text-zinc-600";
          let iconClass = "";
          
          if (state === 'completed') {
            circleClass = "bg-emerald-500 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]";
          } else if (state === 'active') {
            circleClass = "bg-brand-600 border-brand-500 text-white ring-4 ring-brand-500/20";
            iconClass = "animate-pulse";
          } else if (state === 'error') {
            circleClass = "bg-red-500 border-red-500 text-white";
          }

          return (
            <div key={step.id} className="flex flex-col items-center gap-2 relative bg-zinc-950 px-2">
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${circleClass}`}>
                {state === 'completed' ? <Check size={18} /> : <Icon size={18} className={iconClass} />}
              </div>
              <span className={`text-xs font-medium uppercase tracking-wider ${
                state === 'active' || state === 'completed' ? 'text-zinc-200' : 'text-zinc-600'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};