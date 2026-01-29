import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Download, Loader2, FileText, FileJson, FileType, FileCode, Table } from 'lucide-react';

const EXPORT_FORMATS = [
  { id: 'pdf', label: 'PDF', icon: FileText, color: 'text-red-500' },
  { id: 'docx', label: 'Word (DOCX)', icon: FileType, color: 'text-blue-500' },
  { id: 'json', label: 'JSON', icon: FileJson, color: 'text-amber-500' },
  { id: 'txt', label: 'Plain Text (TXT)', icon: FileText, color: 'text-gray-500' },
  { id: 'markdown', label: 'Markdown', icon: FileCode, color: 'text-purple-500' },
  { id: 'csv', label: 'CSV', icon: Table, color: 'text-green-500' },
];

export function ExportModal({ open, onOpenChange, onExport, isLoading }) {
  const [format, setFormat] = useState('pdf');
  const [includeAnswers, setIncludeAnswers] = useState(false);
  const [includeHints, setIncludeHints] = useState(false);
  const [includeExplanations, setIncludeExplanations] = useState(false);

  const handleExport = () => {
    onExport(format, { includeAnswers, includeHints, includeExplanations });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Question Bank</DialogTitle>
          <DialogDescription>
            Select export format and configure options
          </DialogDescription>
        </DialogHeader>

        {/* Format Selection - Radio Buttons */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Export Format</Label>
          <div className="grid grid-cols-2 gap-2">
            {EXPORT_FORMATS.map((fmt) => (
              <label
                key={fmt.id}
                className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors
                  ${format === fmt.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
              >
                <input
                  type="radio"
                  name="format"
                  value={fmt.id}
                  checked={format === fmt.id}
                  onChange={(e) => setFormat(e.target.value)}
                  className="sr-only"
                />
                <fmt.icon className={`w-4 h-4 ${fmt.color}`} />
                <span className="text-sm">{fmt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Configuration - Checkboxes */}
        <div className="space-y-3 pt-2">
          <Label className="text-sm font-medium">Include in Export</Label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeAnswers}
                onChange={(e) => setIncludeAnswers(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Answers</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeHints}
                onChange={(e) => setIncludeHints(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Hints</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeExplanations}
                onChange={(e) => setIncludeExplanations(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Explanations</span>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
