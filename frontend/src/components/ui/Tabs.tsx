import { useState } from 'react';
import type { ReactNode } from 'react';

export type Tab = {
  label: string;
  key: string;
  content: ReactNode;
};

export function Tabs({ tabs, defaultKey }: { tabs: Tab[]; defaultKey?: string }) {
  const [active, setActive] = useState(defaultKey || tabs[0]?.key);
  return (
    <div>
      <div className="flex gap-2 border-b mb-4">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${active === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-primary'}`}
            onClick={() => setActive(tab.key)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>{tabs.find(tab => tab.key === active)?.content}</div>
    </div>
  );
}
export default Tabs;
