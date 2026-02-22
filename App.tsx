import React, { useState, useRef } from 'react';
import { TextBlock, BlockType } from './types';

const MAX_CHARS = 4950;

const App: React.FC = () => {
  const [blocks, setBlocks] = useState<TextBlock[]>([]);
  const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [totalChars, setTotalChars] = useState<number>(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const splitText = (text: string): TextBlock[] => {
    const result: TextBlock[] = [];
    let currentPos = 0;
    let specialTriggered = false;
    const sanitizedText = text.replace(/\r\n/g, '\n');
    const fileId = Date.now().toString(36);

    while (currentPos < sanitizedText.length) {
      let endPos = currentPos + MAX_CHARS;
      
      if (endPos < sanitizedText.length) {
        const lastNewLine = sanitizedText.lastIndexOf('\n', endPos);
        if (lastNewLine > currentPos) {
          endPos = lastNewLine;
        }
      } else {
        endPos = sanitizedText.length;
      }

      const chunk = sanitizedText.slice(currentPos, endPos);
      const containsSpecial = chunk.includes('[&$]');
      
      let type = BlockType.NORMAL;
      if (specialTriggered) {
        type = BlockType.POST_SPECIAL;
      } else if (containsSpecial) {
        type = BlockType.SPECIAL_TRIGGER;
        specialTriggered = true;
      }

      result.push({
        id: `block-${fileId}-${result.length}-${chunk.length}`,
        content: chunk,
        type: type
      });

      currentPos = endPos;
      if (sanitizedText[currentPos] === '\n') {
        currentPos++;
      }
    }

    return result;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      try {
        const result = await (window as any).mammoth.extractRawText({ arrayBuffer });
        const text = result.value;
        setTotalChars(text.length);
        const generatedBlocks = splitText(text);
        setBlocks(generatedBlocks);
        setActiveBlockIndex(null);
        blockRefs.current.clear();
      } catch (err) {
        console.error('Error parsing .docx file:', err);
        alert('Error al procesar el archivo .docx.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const resetApp = () => {
    const confirmed = window.confirm('¿Deseas reiniciar la aplicación?');
    if (confirmed) {
      setBlocks([]);
      setTotalChars(0);
      setActiveBlockIndex(null);
      blockRefs.current.clear();
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = async (index: number) => {
    if (index >= blocks.length) return;
    const block = blocks[index];
    try {
      await navigator.clipboard.writeText(block.content);
      setActiveBlockIndex(index);
    } catch (err) {
      console.error('Copy failed: ', err);
    }
  };

  return (
    <div className={`flex flex-col min-h-[100dvh] w-full transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      <header className="p-4 border-b">
        <h1 className="text-xl font-bold">Text Splitter Pro</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        {blocks.map((block, index) => (
          <div key={block.id} className="mb-4 p-3 border rounded">
            <button
              onClick={() => handleButtonClick(index)}
              className="bg-indigo-500 text-white px-3 py-1 rounded"
            >
              Copiar bloque {index + 1}
            </button>
            <pre className="mt-2 whitespace-pre-wrap">{block.content}</pre>
          </div>
        ))}
      </main>

      <footer className="p-4 border-t">
        <input
          type="file"
          accept=".docx"
          ref={fileInputRef}
          onChange={handleFileUpload}
        />
        <button
          onClick={resetApp}
          className="ml-2 bg-rose-600 text-white px-3 py-1 rounded"
        >
          Reiniciar
        </button>
      </footer>
    </div>
  );
};

export default App;
