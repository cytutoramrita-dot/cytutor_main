import React from 'react';
import { ChevronDown } from 'lucide-react';
import { ResolvedPathStage } from '../../utils/learningPathProgress';
import PathNode from './PathNode';

interface PathStageGraphProps {
  stages: ResolvedPathStage[];
}

const PathStageGraph: React.FC<PathStageGraphProps> = ({ stages }) => {
  return (
    <div className="space-y-2">
      {stages.map((stage, idx) => (
        <React.Fragment key={`${stage.label}-${idx}`}>
          {idx > 0 && (
            <div className="flex justify-center py-1">
              <ChevronDown className={`h-5 w-5 ${stages[idx - 1].complete ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`} />
            </div>
          )}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{stage.label}</h3>
            <div className="flex flex-wrap gap-3">
              {stage.nodes.map((node) => (
                <PathNode key={node.key} node={node} />
              ))}
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

export default PathStageGraph;
