import React, { useState } from 'react';
import { WorkOrderEventAttachment } from '../types';
import { X, ChevronLeft, ChevronRight, Download, Image as ImageIcon, Video } from 'lucide-react';

interface EventMediaModalProps {
  attachments: WorkOrderEventAttachment[];
  initialIndex?: number;
  onClose: () => void;
}

export const EventMediaModal: React.FC<EventMediaModalProps> = ({ attachments, initialIndex = 0, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  if (!attachments || attachments.length === 0) return null;

  const currentMedia = attachments[currentIndex];
  const isImage = currentMedia?.fileType?.startsWith('image/') || currentMedia?.fileName?.match(/\.(jpeg|jpg|gif|png|webp)$/i);
  const isVideo = currentMedia?.fileType?.startsWith('video/') || currentMedia?.fileName?.match(/\.(mp4|webm|ogg)$/i);

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % attachments.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + attachments.length) % attachments.length);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4" onClick={onClose}>
      
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-10" onClick={(e) => e.stopPropagation()}>
        <div className="text-white flex flex-col">
          <span className="font-bold text-lg truncate max-w-[70vw]">{currentMedia.fileName}</span>
          <span className="text-xs text-gray-400">{currentIndex + 1} de {attachments.length}</span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={currentMedia.fileUrl} 
            download={currentMedia.fileName} 
            target="_blank" 
            rel="noopener noreferrer"
            title="Fazer Download Original"
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur transition-colors"
          >
            <Download size={20} />
          </a>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Display */}
      <div className="relative w-full h-full max-h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        
        {/* Nav Left */}
        {attachments.length > 1 && (
          <button onClick={handlePrev} className="absolute left-4 p-3 bg-black/50 text-white rounded-full hover:bg-brand-600 transition-colors z-10">
            <ChevronLeft size={24} />
          </button>
        )}

        {/* Media Container */}
        <div className="max-w-5xl max-h-[85vh] flex items-center justify-center rounded-xl overflow-hidden shadow-2xl relative">
           {isImage ? (
             <img src={currentMedia.fileUrl} alt={currentMedia.fileName} className="max-w-full max-h-[85vh] object-contain select-none" />
           ) : isVideo ? (
             <video src={currentMedia.fileUrl} controls autoPlay className="max-w-full max-h-[85vh] rounded-lg" />
           ) : (
             <div className="bg-gray-100 w-80 h-80 rounded-xl flex flex-col items-center justify-center text-gray-600 gap-4 p-6 text-center">
                <ImageIcon size={64} className="text-gray-300" />
                <div>
                   <h3 className="font-bold text-gray-800">Visualização de Mídia não suportada</h3>
                   <p className="text-sm mt-1 mb-4">Este tipo de arquivo precisa ser baixado para ser aberto ({currentMedia.fileType || currentMedia.fileName.split('.').pop()}).</p>
                   <a href={currentMedia.fileUrl} target="_blank" rel="noopener noreferrer" className="bg-brand-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-brand-700 transition">Baixar Arquivo</a>
                </div>
             </div>
           )}
        </div>

        {/* Nav Right */}
        {attachments.length > 1 && (
          <button onClick={handleNext} className="absolute right-4 p-3 bg-black/50 text-white rounded-full hover:bg-brand-600 transition-colors z-10">
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {/* Thumbnails */}
      {attachments.length > 1 && (
         <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/50 rounded-xl backdrop-blur max-w-full overflow-x-auto" onClick={(e) => e.stopPropagation()}>
           {attachments.map((att, idx) => {
             const isThumbImage = att.fileType?.startsWith('image/') || att.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i);
             const isThumbVideo = att.fileType?.startsWith('video/') || att.fileName.match(/\.(mp4|webm|ogg)$/i);
             
             return (
               <button 
                 key={att.id} 
                 onClick={() => setCurrentIndex(idx)}
                 className={`h-14 w-14 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${idx === currentIndex ? 'border-brand-500 scale-105' : 'border-transparent opacity-50 hover:opacity-100'}`}
               >
                 {isThumbImage ? (
                    <img src={att.fileUrl} className="w-full h-full object-cover" />
                 ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-400">
                      {isThumbVideo ? <Video size={20}/> : <ImageIcon size={20}/>}
                    </div>
                 )}
               </button>
             );
           })}
         </div>
      )}

    </div>
  );
};
