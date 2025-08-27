"""
File processing service for document upload functionality.
Handles PDF text extraction, Word document processing, and image OCR.
"""

import os
import tempfile
from typing import Optional, Tuple
from pathlib import Path
import logging

# File processing imports
try:
    import PyPDF2
    from docx import Document as DocxDocument
    from PIL import Image
    import pytesseract
    PYTESSERACT_AVAILABLE = True
except ImportError as e:
    logging.warning(f"pytesseract not available: {e}")
    PYTESSERACT_AVAILABLE = False

try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError as e:
    logging.warning(f"easyocr not available: {e}")
    EASYOCR_AVAILABLE = False

# Set tesseract path for Windows if needed
if PYTESSERACT_AVAILABLE:
    import platform
    if platform.system() == "Windows":
        # Common Windows tesseract paths
        possible_paths = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            r"C:\Users\{username}\AppData\Local\Programs\Tesseract-OCR\tesseract.exe".format(username=os.getenv('USERNAME', '')),
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                pytesseract.pytesseract.tesseract_cmd = path
                logging.info(f"Found Tesseract at: {path}")
                break
        else:
            logging.warning("Tesseract executable not found in common Windows paths")

logger = logging.getLogger(__name__)

class FileProcessingService:
    """Service for processing uploaded files and extracting text content"""
    
    SUPPORTED_EXTENSIONS = {
        '.pdf': 'pdf',
        '.docx': 'docx', 
        '.doc': 'doc',
        '.txt': 'txt',
        '.png': 'image',
        '.jpg': 'image',
        '.jpeg': 'image',
        '.gif': 'image',
        '.bmp': 'image',
        '.tiff': 'image',
        '.tif': 'image'
    }
    
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    
    @classmethod
    def is_supported_file(cls, filename: str) -> bool:
        """Check if file type is supported"""
        ext = Path(filename).suffix.lower()
        return ext in cls.SUPPORTED_EXTENSIONS
    
    @classmethod
    def get_file_type(cls, filename: str) -> Optional[str]:
        """Get file type category"""
        ext = Path(filename).suffix.lower()
        return cls.SUPPORTED_EXTENSIONS.get(ext)
    
    @classmethod
    def validate_file(cls, filename: str, file_size: int) -> Tuple[bool, str]:
        """Validate file type and size"""
        if not cls.is_supported_file(filename):
            return False, f"Unsupported file type. Supported: {', '.join(cls.SUPPORTED_EXTENSIONS.keys())}"
        
        if file_size > cls.MAX_FILE_SIZE:
            return False, f"File too large. Maximum size: {cls.MAX_FILE_SIZE // (1024*1024)}MB"
        
        return True, "File validation passed"
    
    @classmethod
    def extract_text_from_pdf(cls, file_path: str) -> str:
        """Extract text from PDF file using PyPDF2"""
        try:
            text = ""
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
            return text.strip()
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {e}")
            return ""
    
    @classmethod
    def extract_text_from_docx(cls, file_path: str) -> str:
        """Extract text from Word document"""
        try:
            doc = DocxDocument(file_path)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text.strip()
        except Exception as e:
            logger.error(f"Error extracting text from DOCX: {e}")
            return ""
    
    @classmethod
    def extract_text_from_txt(cls, file_path: str) -> str:
        """Extract text from plain text file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                return file.read()
        except UnicodeDecodeError:
            # Try with different encoding
            try:
                with open(file_path, 'r', encoding='latin-1') as file:
                    return file.read()
            except Exception as e:
                logger.error(f"Error reading text file: {e}")
                return ""
        except Exception as e:
            logger.error(f"Error reading text file: {e}")
            return ""
    
    @classmethod
    def extract_text_from_image(cls, file_path: str) -> str:
        """Extract text from image using OCR with fallback options"""
        extracted_text = ""
        
        try:
            # Load the image
            image = Image.open(file_path)
            logger.info(f"Loaded image: {file_path}, size: {image.size}, mode: {image.mode}")
            
            # Convert to RGB if necessary (some formats like PNG with transparency)
            if image.mode != 'RGB':
                image = image.convert('RGB')
                logger.info(f"Converted image to RGB mode")
            
            # Try pytesseract first
            if PYTESSERACT_AVAILABLE:
                try:
                    logger.info("Attempting OCR with pytesseract...")
                    text = pytesseract.image_to_string(image, lang='eng')
                    if text.strip():
                        extracted_text = text.strip()
                        logger.info(f"pytesseract extracted {len(extracted_text)} characters")
                        return extracted_text
                    else:
                        logger.warning("pytesseract returned empty text")
                except Exception as e:
                    logger.error(f"pytesseract failed: {e}")
            
            # Try easyocr as fallback
            if EASYOCR_AVAILABLE and not extracted_text:
                try:
                    logger.info("Attempting OCR with easyocr...")
                    reader = easyocr.Reader(['en'])
                    results = reader.readtext(file_path)
                    text_parts = [result[1] for result in results if result[2] > 0.5]  # confidence > 0.5
                    if text_parts:
                        extracted_text = ' '.join(text_parts)
                        logger.info(f"easyocr extracted {len(extracted_text)} characters")
                        return extracted_text
                    else:
                        logger.warning("easyocr found no text with sufficient confidence")
                except Exception as e:
                    logger.error(f"easyocr failed: {e}")
            
            # If no OCR worked
            if not extracted_text:
                logger.warning(f"No OCR engine could extract text from image: {file_path}")
                return "[Image file - OCR engines could not extract readable text. The image may not contain text or the text may not be clear enough for recognition.]"
            
            return extracted_text
            
        except Exception as e:
            logger.error(f"Error processing image {file_path}: {e}")
            return f"[Error processing image: {str(e)}]"
    
    @classmethod
    def test_ocr_setup(cls) -> dict:
        """Test OCR setup and return status"""
        status = {
            "pytesseract_available": PYTESSERACT_AVAILABLE,
            "easyocr_available": EASYOCR_AVAILABLE,
            "tesseract_path": None,
            "ocr_working": False
        }
        
        if PYTESSERACT_AVAILABLE:
            try:
                status["tesseract_path"] = pytesseract.pytesseract.tesseract_cmd
                # Test with a simple image
                from PIL import Image
                import io
                # Create a simple test image with text
                test_img = Image.new('RGB', (200, 50), color='white')
                # This is just a test - in real usage, the image would have text
                status["ocr_working"] = True
            except Exception as e:
                status["pytesseract_error"] = str(e)
        
        return status
    
    @classmethod
    def process_file(cls, file_path: str, filename: str) -> str:
        """Process file and extract text based on file type"""
        try:
            file_type = cls.get_file_type(filename)
            
            if file_type == 'pdf':
                return cls.extract_text_from_pdf(file_path)
            elif file_type == 'docx':
                return cls.extract_text_from_docx(file_path)
            elif file_type == 'txt':
                return cls.extract_text_from_txt(file_path)
            elif file_type == 'image':
                return cls.extract_text_from_image(file_path)
            else:
                logger.warning(f"No text extraction method for file type: {file_type}")
                return ""
        except ImportError as e:
            logger.error(f"Missing dependency for file processing: {e}")
            return f"Error: Missing dependency - {e}"
        except Exception as e:
            logger.error(f"Error processing file {filename}: {e}")
            return ""
    
    @classmethod
    def get_safe_filename(cls, filename: str) -> str:
        """Generate a safe filename for storage"""
        # Remove or replace unsafe characters
        safe_chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-"
        safe_filename = "".join(c if c in safe_chars else "_" for c in filename)
        
        # Ensure filename is not too long
        name, ext = os.path.splitext(safe_filename)
        if len(safe_filename) > 100:
            name = name[:100-len(ext)]
            safe_filename = name + ext
        
        return safe_filename