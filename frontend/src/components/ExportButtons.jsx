import { useState } from 'react';

const API_URL = 'http://localhost:5000/api';

export default function ExportButtons({ transcriptId, transcriptTitle }) {
  const [exporting, setExporting] = useState(null);

  const handleExport = async (type) => {
    if (!transcriptId) {
      alert('Please select a transcript first.');
      return;
    }
    setExporting(type);
    try {
      const url = `${API_URL}/export/${type}/${transcriptId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${transcriptTitle || 'export'}.${type}`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      alert('Export failed: ' + err.message);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleExport('csv')}
        disabled={!transcriptId || exporting === 'csv'}
        className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1.5 rounded-lg font-semibold transition disabled:opacity-50"
      >
        {exporting === 'csv' ? '⏳' : '📊'} CSV
      </button>
      <button
        onClick={() => handleExport('pdf')}
        disabled={!transcriptId || exporting === 'pdf'}
        className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1.5 rounded-lg font-semibold transition disabled:opacity-50"
      >
        {exporting === 'pdf' ? '⏳' : '📄'} PDF
      </button>
    </div>
  );
}
