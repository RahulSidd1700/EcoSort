import { useEffect, useId, useRef, useState } from 'react';
import { Camera, ImagePlus, Trash2 } from 'lucide-react';
import Button from './ui/Button';
import Modal from './ui/Modal';
import Alert from './ui/Alert';
import { validateImage } from '../utils/validation';

const hasCamera = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

/**
 * Lets the user choose an image (or take a photo), validates type/size and shows a preview.
 * Props: file, onChange(file|null), existingUrl (when editing), label, error
 */
export default function ImageUpload({ file, onChange, existingUrl = '', label = 'Image', error, required, disabled }) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [localError, setLocalError] = useState('');
  const [preview, setPreview] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (selected) => {
    if (!selected) return;
    const message = validateImage(selected);
    // Large photos are compressed automatically before upload, so only reject on type here.
    if (message && !message.startsWith('Image is too large')) {
      setLocalError(message);
      return;
    }
    if (selected.size > 20 * 1024 * 1024) {
      setLocalError('Image is too large. Please choose a smaller photo.');
      return;
    }
    setLocalError('');
    onChange(selected);
  };

  const shown = preview || existingUrl;

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {shown ? (
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          <img src={shown} alt="Selected waste preview" className="mx-auto max-h-72 w-full object-contain" />
          {!disabled && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                if (inputRef.current) inputRef.current.value = '';
              }}
              className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-lg bg-white/90 px-2.5 py-1.5 text-sm font-medium text-red-700 shadow hover:bg-white"
            >
              <Trash2 size={16} aria-hidden="true" /> Remove
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-8 text-center">
          <ImagePlus size={32} className="text-brand-600" aria-hidden="true" />
          <p className="text-sm text-slate-500">JPG, PNG or WebP. Max 5 MB (large photos are resized automatically).</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" icon={ImagePlus} onClick={() => inputRef.current?.click()} disabled={disabled}>
              Upload image
            </Button>
            {hasCamera && (
              <Button variant="secondary" icon={Camera} onClick={() => setCameraOpen(true)} disabled={disabled}>
                Take photo
              </Button>
            )}
          </div>
        </div>
      )}
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => pick(e.target.files?.[0])}
        disabled={disabled}
      />
      <Alert type="error">{localError || error}</Alert>
      {cameraOpen && (
        <CameraCapture
          onClose={() => setCameraOpen(false)}
          onCapture={(f) => {
            setCameraOpen(false);
            pick(f);
          }}
        />
      )}
    </div>
  );
}

function CameraCapture({ onClose, onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError('Camera is not available. Please allow camera access or upload an image instead.'));
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => blob && onCapture(new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' })),
      'image/jpeg',
      0.9,
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Take a photo"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button icon={Camera} onClick={capture} disabled={Boolean(error)}>
            Capture
          </Button>
        </>
      }
    >
      {error ? (
        <Alert type="error">{error}</Alert>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full rounded-lg bg-black"
          aria-label="Camera preview"
        />
      )}
    </Modal>
  );
}
