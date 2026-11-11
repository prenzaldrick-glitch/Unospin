import React, { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface SampleRecord {
  id: number;
  name: string;
  maskedPhone: string;
  amount: string;
  method: 'GCash' | 'Maya';
  timestamp: string;
}

// Generate 1,000 realistic SAMPLE records for UI testing
const FIRST_NAMES = [
  'Lovely', 'Juan', 'Mary Joy', 'Mark', 'Christian', 'Angela', 'Jerome', 'Princess',
  'Dennis', 'Christine', 'Ronaldo', 'Jayson', 'Kaye', 'Gabriel', 'Bea', 'Joshua',
  'Patricia', 'John Mark', 'Samantha', 'Aldrin', 'Regine', 'Danilo', 'Jasmine', 'Kevin',
  'Rochelle', 'Bryan', 'Fatima', 'Kenneth', 'Maricel', 'Anthony', 'Michelle', 'Carlo',
  'Rowena', 'Paolo', 'Clarisse', 'Eduardo', 'Janine', 'Raymond', 'Aileen', 'Francis',
  'Rhea', 'Lester', 'Camille', 'Joaquin', 'Stephanie', 'Gideon', 'Hazel', 'Dominic',
  'Renz', 'Althea', 'Nicanor', 'Bernadette', 'Emanuel', 'Trisha', 'Ramon', 'Grace',
  'Dante', 'Liza', 'Ferdinand', 'Evelyn', 'Wilfredo', 'Gemma', 'Rodrigo', 'Analyn',
  'Salvador', 'Cherry', 'Renato', 'Liezel', 'Orlando', 'Glenda', 'Ernesto', 'Jennifer',
  'Vicente', 'Marilyn', 'Gilbert', 'Kristine', 'Arman', 'Sheryl', 'Eugenio', 'Lilibeth'
];

const LAST_INITIALS = ['A.', 'B.', 'C.', 'D.', 'E.', 'G.', 'H.', 'L.', 'M.', 'N.', 'P.', 'R.', 'S.', 'T.', 'V.', 'Z.'];

const PREFIXES = ['0917', '0918', '0919', '0920', '0905', '0906', '0922', '0923', '0998', '0999', '0928', '0915', '0939', '0949', '0956', '0977'];

const generateSampleData = (): SampleRecord[] => {
  const records: SampleRecord[] = [];
  for (let i = 0; i < 1000; i++) {
    const fn = FIRST_NAMES[i % FIRST_NAMES.length];
    const li = LAST_INITIALS[(i * 7) % LAST_INITIALS.length];
    const name = `${fn} ${li}`;
    if (name.toLowerCase().includes('lavigne')) continue;

    const prefix = PREFIXES[(i * 3) % PREFIXES.length];
    const suffix = String((i * 137 + 1234) % 9000 + 1000);
    const maskedPhone = `${prefix}***${suffix}`;

    const method: 'GCash' | 'Maya' = i % 2 === 0 ? 'GCash' : 'Maya';
    const minutesAgo = (i % 59) + 1;
    const timestamp = minutesAgo === 1 ? 'Just now' : `${minutesAgo}m ago`;

    records.push({
      id: i,
      name,
      maskedPhone,
      amount: '₱500.00',
      method,
      timestamp,
    });
  }
  return records;
};

const SAMPLE_RECORDS = generateSampleData();

export const RecentWithdrawalsTicker: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % SAMPLE_RECORDS.length);
    }, 3200);

    return () => clearInterval(timer);
  }, []);

  const current = SAMPLE_RECORDS[currentIndex];
  const isGCash = current.method === 'GCash';

  return (
    <div className="w-full bg-slate-950/95 border-b border-amber-500/30 px-2 py-1.5 flex items-center justify-between text-[11px] font-sans z-30 select-none shadow-md backdrop-blur-md overflow-hidden">
      
      {/* RECENT WITHDRAWALS BADGE */}
      <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-400/40 rounded-md px-1.5 py-0.5 shrink-0">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[9px] font-black text-amber-200 uppercase tracking-wider">
          RECENT WITHDRAWALS
        </span>
      </div>

      {/* TICKER NOTIFICATION ITEM */}
      <div className="flex-1 overflow-hidden relative h-5 flex items-center justify-end pl-2">
        <div
          key={current.id}
          className="animate-slide-item flex items-center gap-1.5 whitespace-nowrap font-medium text-slate-200"
        >
          {/* User Name */}
          <span className="text-white font-black truncate max-w-[90px] sm:max-w-[120px]">
            {current.name}
          </span>
          <span className="text-slate-300 font-semibold">withdrew</span>

          {/* Amount */}
          <span className="text-yellow-300 font-black">
            {current.amount}
          </span>

          <span className="text-slate-300 font-semibold">via</span>

          {/* Method Badge */}
          <span
            className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase text-white shadow-sm ${
              isGCash ? 'bg-blue-600' : 'bg-emerald-600'
            }`}
          >
            {current.method}
          </span>

          {/* Masked Account */}
          <span className="text-slate-400 text-[10px] font-mono hidden sm:inline">
            ({current.maskedPhone})
          </span>

          {/* Success Check & Time */}
          <span className="text-emerald-400 font-bold flex items-center gap-0.5 text-[10px]">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> {current.timestamp}
          </span>
        </div>
      </div>
    </div>
  );
};
