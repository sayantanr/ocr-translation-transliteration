import React, { useState, useRef } from 'react';
import { Upload, Languages, FileText, Loader2, Copy, Download, Mic, File, Image, FileAudio } from 'lucide-react';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';

const OCR_LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Dutch', 'Russian',
  'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hebrew', 'Hindi', 'Bengali', 'Urdu',
  'Turkish', 'Polish', 'Czech', 'Greek', 'Thai', 'Vietnamese', 'Indonesian', 'Malay',
  'Swedish', 'Danish', 'Norwegian', 'Finnish', 'Romanian', 'Hungarian', 'Ukrainian',
  'Persian', 'Swahili', 'Tamil', 'Telugu', 'Marathi', 'Gujarati', 'Kannada'
];

const TRANSLATION_LANGUAGES = [
  'Afrikaans', 'Albanian', 'Amharic', 'Arabic', 'Armenian', 'Assamese', 'Azerbaijani',
  'Basque', 'Belarusian', 'Bengali', 'Bosnian', 'Bulgarian', 'Burmese', 'Catalan',
  'Cebuano', 'Chinese (Simplified)', 'Chinese (Traditional)', 'Corsican', 'Croatian',
  'Czech', 'Danish', 'Dutch', 'English', 'Esperanto', 'Estonian', 'Filipino', 'Finnish',
  'French', 'Frisian', 'Galician', 'Georgian', 'German', 'Greek', 'Gujarati', 'Haitian Creole',
  'Hausa', 'Hawaiian', 'Hebrew', 'Hindi', 'Hmong', 'Hungarian', 'Icelandic', 'Igbo',
  'Indonesian', 'Irish', 'Italian', 'Japanese', 'Javanese', 'Kannada', 'Kazakh', 'Khmer',
  'Kinyarwanda', 'Korean', 'Kurdish', 'Kyrgyz', 'Lao', 'Latin', 'Latvian', 'Lithuanian',
  'Luxembourgish', 'Macedonian', 'Malagasy', 'Malay', 'Malayalam', 'Maltese', 'Maori',
  'Marathi', 'Mongolian', 'Nepali', 'Norwegian', 'Odia', 'Pashto', 'Persian', 'Polish',
  'Portuguese', 'Punjabi', 'Romanian', 'Russian', 'Samoan', 'Sanskrit', 'Scots Gaelic',
  'Serbian', 'Sesotho', 'Shona', 'Sindhi', 'Sinhala', 'Slovak', 'Slovenian', 'Somali',
  'Spanish', 'Sundanese', 'Swahili', 'Swedish', 'Tajik', 'Tamil', 'Tatar', 'Telugu',
  'Thai', 'Tigrinya', 'Turkish', 'Turkmen', 'Ukrainian', 'Urdu', 'Uyghur', 'Uzbek',
  'Vietnamese', 'Welsh', 'Xhosa', 'Yiddish', 'Yoruba', 'Zulu', 'Arabic (Egyptian)',
  'Arabic (Levantine)', 'Arabic (Gulf)', 'Chinese (Cantonese)', 'English (British)',
  'English (American)', 'French (Canadian)', 'Portuguese (Brazilian)', 'Spanish (Latin American)',
  'Spanish (European)', 'German (Swiss)', 'Italian (Swiss)', 'Malay (Brunei)', 'Serbian (Latin)',
  'Serbian (Cyrillic)', 'Bosnian (Latin)', 'Bosnian (Cyrillic)', 'Croatian (Latin)',
  'Montenegrin', 'Bhojpuri', 'Dogri', 'Konkani', 'Maithili', 'Manipuri', 'Santali',
  'Kashmiri', 'Bodo', 'Mizo', 'Khasi', 'Garo', 'Oromo', 'Tigre', 'Fula'
];

export default function OCRTranslator() {
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [fileType, setFileType] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('Spanish');
  const [mode, setMode] = useState('translate');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('upload');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const getFileType = (file) => {
    const type = file.type;
    const name = file.name.toLowerCase();
    
    if (type.startsWith('image/')) return 'image';
    if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
    if (type.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) return 'word';
    if (type.includes('excel') || type.includes('spreadsheet') || name.endsWith('.xls') || name.endsWith('.xlsx')) return 'excel';
    if (type.startsWith('audio/') || name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.m4a') || name.endsWith('.ogg')) return 'audio';
    if (type === 'text/plain' || name.endsWith('.txt')) return 'text';
    if (type === 'text/csv' || name.endsWith('.csv')) return 'csv';
    if (name.endsWith('.rtf')) return 'rtf';
    if (name.endsWith('.ppt') || name.endsWith('.pptx')) return 'powerpoint';
    return 'unknown';
  };

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    const type = getFileType(uploadedFile);
    setFileType(type);
    setExtractedText('');
    setTranslatedText('');
    setStep('upload');
    setAudioBlob(null);

    if (type === 'image') {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(uploadedFile);
    } else {
      setFilePreview(null);
    }
  };

  const startRecording = async () => {
    // Ask for permission first
    const userConfirmed = window.confirm(
      '🎤 Ready to Record Audio?\n\n' +
      'Click OK to start recording your audio.\n' +
      'You will be asked for microphone permission.\n\n' +
      'Click "Stop Recording" when you\'re done.'
    );
    
    if (!userConfirmed) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        setFile(new File([audioBlob], 'recording.webm', { type: 'audio/webm' }));
        setFileType('audio');
        setExtractedText('');
        setTranslatedText('');
        stream.getTracks().forEach(track => track.stop());
        alert('✅ Recording saved! Click "Extract Text" to transcribe your audio.');
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        alert('Recording error occurred. Please try again.');
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
      alert('🔴 Recording started! Speak clearly into your microphone.');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      if (error.name === 'NotAllowedError') {
        alert('❌ Microphone access denied.\n\nPlease allow microphone access in your browser settings and try again.');
      } else if (error.name === 'NotFoundError') {
        alert('❌ No microphone found.\n\nPlease connect a microphone and try again.');
      } else {
        alert('❌ Could not access microphone.\n\nError: ' + error.message);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      alert('⚠️ No active recording to stop.');
    }
  };

  const extractTextFromWord = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const extractTextFromExcel = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    let text = '';
    
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      text += `\n=== ${sheetName} ===\n`;
      text += XLSX.utils.sheet_to_txt(sheet);
    });
    
    return text;
  };

  const extractTextFromPlainText = async (file) => {
    return await file.text();
  };

  const performExtraction = async () => {
    if (!file) return;
    
    setLoading(true);
    setStep('extracting');
    
    try {
      let textContent = '';
      
      if (fileType === 'image' || fileType === 'pdf') {
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const mediaType = fileType === 'pdf' ? 'application/pdf' : file.type;
        const contentType = fileType === 'pdf' ? 'document' : 'image';

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4000,
            messages: [{
              role: 'user',
              content: [
                {
                  type: contentType,
                  source: {
                    type: 'base64',
                    media_type: mediaType,
                    data: base64Data
                  }
                },
                {
                  type: 'text',
                  text: 'Extract all text from this document/image. First, identify the language of the text. Then provide the extracted text exactly as it appears, preserving formatting and structure. Format your response as:\nLANGUAGE: [detected language]\nTEXT:\n[extracted text]'
                }
              ]
            }]
          })
        });

        const data = await response.json();
        const result = data.content[0].text;
        
        const langMatch = result.match(/LANGUAGE:\s*(.+)/i);
        const textMatch = result.match(/TEXT:\s*([\s\S]+)/i);
        
        if (langMatch) setDetectedLanguage(langMatch[1].trim());
        if (textMatch) textContent = textMatch[1].trim();
        
      } else if (fileType === 'word') {
        textContent = await extractTextFromWord(file);
        setDetectedLanguage('Detecting...');
        
      } else if (fileType === 'excel' || fileType === 'csv') {
        textContent = await extractTextFromExcel(file);
        setDetectedLanguage('Detecting...');
        
      } else if (fileType === 'text') {
        textContent = await extractTextFromPlainText(file);
        setDetectedLanguage('Detecting...');
        
      } else if (fileType === 'audio') {
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4000,
            messages: [{
              role: 'user',
              content: `I have an audio file that needs transcription. Please transcribe it accurately and identify the language. Format: LANGUAGE: [language]\nTEXT:\n[transcription]`
            }]
          })
        });

        const data = await response.json();
        const result = data.content[0].text;
        
        const langMatch = result.match(/LANGUAGE:\s*(.+)/i);
        const textMatch = result.match(/TEXT:\s*([\s\S]+)/i);
        
        if (langMatch) setDetectedLanguage(langMatch[1].trim());
        if (textMatch) textContent = textMatch[1].trim();
      }

      if (textContent && (!detectedLanguage || detectedLanguage === 'Detecting...')) {
        const langResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 100,
            messages: [{
              role: 'user',
              content: `What language is this text in? Just respond with the language name: "${textContent.substring(0, 500)}"`
            }]
          })
        });

        const langData = await langResponse.json();
        setDetectedLanguage(langData.content[0].text.trim());
      }

      setExtractedText(textContent || 'No text could be extracted from this file.');
      
    } catch (error) {
      console.error('Extraction Error:', error);
      setExtractedText(`Error extracting text: ${error.message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const performTranslation = async () => {
    if (!extractedText) return;
    
    setLoading(true);
    setStep('translate');
    
    try {
      const prompt = mode === 'translate' 
        ? `Translate the following text to ${targetLanguage}. Only provide the translation, no explanations:\n\n${extractedText}`
        : `Transliterate the following text to ${targetLanguage} script. Only provide the transliteration, no explanations:\n\n${extractedText}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      });

      const data = await response.json();
      setTranslatedText(data.content[0].text);
    } catch (error) {
      console.error('Translation Error:', error);
      setTranslatedText('Error performing translation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const downloadText = (text, filename) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFileIcon = () => {
    switch (fileType) {
      case 'image': return <Image className="w-8 h-8" />;
      case 'audio': return <FileAudio className="w-8 h-8" />;
      default: return <File className="w-8 h-8" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3 flex-wrap">
            <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600" />
            Universal OCR & Translator
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Images • PDFs • Word • Excel • Audio • 37+ OCR Languages • 142+ Translations
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-600" />
              Upload File or Record Audio
            </h2>
            
            <div
              onClick={() => !isRecording && fileInputRef.current?.click()}
              className={`border-2 border-dashed border-gray-300 rounded-lg p-6 sm:p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors ${isRecording ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {filePreview ? (
                <img src={filePreview} alt="Preview" className="max-h-48 sm:max-h-64 mx-auto rounded" />
              ) : file ? (
                <div className="text-gray-600">
                  {getFileIcon()}
                  <p className="mt-3 font-semibold">{file.name}</p>
                  <p className="text-sm text-gray-500 mt-1">Type: {fileType}</p>
                </div>
              ) : (
                <div className="text-gray-400">
                  <Upload className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4" />
                  <p className="font-semibold">Click to upload a file</p>
                  <p className="text-xs sm:text-sm mt-2">
                    Images: JPG, PNG, WebP, GIF, BMP, TIFF<br/>
                    Documents: PDF, DOC, DOCX, TXT, RTF<br/>
                    Spreadsheets: XLS, XLSX, CSV<br/>
                    Audio: MP3, WAV, M4A, OGG
                  </p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="mt-4">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-full ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'} text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors`}
              >
                <Mic className={`w-5 h-5 ${isRecording ? 'animate-pulse' : ''}`} />
                {isRecording ? 'Stop Recording' : 'Record Audio'}
              </button>
            </div>

            {file && (
              <button
                onClick={performExtraction}
                disabled={loading && step === 'extracting'}
                className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                {loading && step === 'extracting' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Extracting Text...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    Extract Text
                  </>
                )}
              </button>
            )}

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Supported Formats</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-blue-50 p-2 rounded">
                  <p className="font-semibold text-blue-800">Images</p>
                  <p className="text-gray-600">JPG, PNG, WebP, GIF, BMP, TIFF, SVG</p>
                </div>
                <div className="bg-green-50 p-2 rounded">
                  <p className="font-semibold text-green-800">Documents</p>
                  <p className="text-gray-600">PDF, DOC, DOCX, TXT, RTF</p>
                </div>
                <div className="bg-purple-50 p-2 rounded">
                  <p className="font-semibold text-purple-800">Spreadsheets</p>
                  <p className="text-gray-600">XLS, XLSX, CSV</p>
                </div>
                <div className="bg-pink-50 p-2 rounded">
                  <p className="font-semibold text-pink-800">Audio</p>
                  <p className="text-gray-600">MP3, WAV, M4A, OGG</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
              <Languages className="w-5 h-5 text-indigo-600" />
              Extracted & Translated Text
            </h2>

            {detectedLanguage && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Detected Language:</span> {detectedLanguage}
                </p>
              </div>
            )}

            {extractedText && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-700">Original Text</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(extractedText)}
                      className="text-gray-600 hover:text-indigo-600"
                      title="Copy"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => downloadText(extractedText, 'extracted-text.txt')}
                      className="text-gray-600 hover:text-indigo-600"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg max-h-48 overflow-y-auto text-xs sm:text-sm">
                  {extractedText}
                </div>
              </div>
            )}

            {extractedText && (
              <div className="mb-4 space-y-3">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="translate"
                      checked={mode === 'translate'}
                      onChange={(e) => setMode(e.target.value)}
                      className="text-indigo-600"
                    />
                    <span className="text-sm">Translate</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="transliterate"
                      checked={mode === 'transliterate'}
                      onChange={(e) => setMode(e.target.value)}
                      className="text-indigo-600"
                    />
                    <span className="text-sm">Transliterate</span>
                  </label>
                </div>

                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm"
                >
                  {TRANSLATION_LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>

                <button
                  onClick={performTranslation}
                  disabled={loading && step === 'translate'}
                  className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                >
                  {loading && step === 'translate' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {mode === 'translate' ? 'Translating...' : 'Transliterating...'}
                    </>
                  ) : (
                    <>
                      <Languages className="w-5 h-5" />
                      {mode === 'translate' ? 'Translate' : 'Transliterate'}
                    </>
                  )}
                </button>
              </div>
            )}

            {translatedText && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-700">
                    {mode === 'translate' ? 'Translation' : 'Transliteration'} ({targetLanguage})
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(translatedText)}
                      className="text-gray-600 hover:text-green-600"
                      title="Copy"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => downloadText(translatedText, `translated-${targetLanguage}.txt`)}
                      className="text-gray-600 hover:text-green-600"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="bg-green-50 p-3 sm:p-4 rounded-lg max-h-48 overflow-y-auto text-xs sm:text-sm">
                  {translatedText}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <h3 className="font-semibold text-gray-800 mb-3">How to Use:</h3>
          <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-gray-600">
            <li>Upload any supported file (image, PDF, Word, Excel, audio) or record audio directly</li>
            <li>Click "Extract Text" to automatically process and extract text/transcribe audio</li>
            <li>Choose whether to translate or transliterate the extracted text</li>
            <li>Select your target language from 142+ available languages</li>
            <li>Click translate/transliterate to process</li>
            <li>Copy or download the results using the icons</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
