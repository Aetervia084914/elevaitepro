# escape=`

FROM mcr.microsoft.com/windows/servercore:ltsc2022

SHELL ["cmd", "/S", "/C"]

# -----------------------------------------------------------------------------
# Environment
# -----------------------------------------------------------------------------

ENV PYTHON_VERSION=3.11.9
ENV PYTHONHOME=C:\Python311
ENV PYTHONUTF8=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR C:\app

# -----------------------------------------------------------------------------
# Install Microsoft Visual C++ Runtime
# -----------------------------------------------------------------------------

RUN powershell -Command ^
    Invoke-WebRequest "https://aka.ms/vs/17/release/vc_redist.x64.exe" -OutFile vc_redist.exe ; ^
    Start-Process .\vc_redist.exe -ArgumentList '/install','/quiet','/norestart' -Wait ; ^
    Remove-Item vc_redist.exe

# -----------------------------------------------------------------------------
# Install Python
# -----------------------------------------------------------------------------

RUN powershell -Command ^
    Invoke-WebRequest "https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe" -OutFile python.exe ; ^
    Start-Process .\python.exe -ArgumentList '/quiet InstallAllUsers=1 PrependPath=1 Include_test=0 Include_launcher=1' -Wait ; ^
    Remove-Item python.exe

ENV PATH="C:\Python311;C:\Python311\Scripts;%PATH%"

# -----------------------------------------------------------------------------
# Upgrade pip
# -----------------------------------------------------------------------------

RUN python -m pip install --upgrade pip setuptools wheel

# -----------------------------------------------------------------------------
# Install Tesseract OCR
# -----------------------------------------------------------------------------

RUN powershell -Command ^
    Invoke-WebRequest "https://github.com/UB-Mannheim/tesseract/releases/download/v5.5.0.20241111/tesseract-ocr-w64-setup-5.5.0.20241111.exe" -OutFile tesseract.exe ; ^
    Start-Process .\tesseract.exe -ArgumentList '/S' -Wait ; ^
    Remove-Item tesseract.exe

# -----------------------------------------------------------------------------
# Install Poppler
# -----------------------------------------------------------------------------

RUN powershell -Command ^
    Invoke-WebRequest "https://github.com/oschwartz10612/poppler-windows/releases/download/v24.08.0-0/Release-24.08.0-0.zip" -OutFile poppler.zip ; ^
    Expand-Archive poppler.zip -DestinationPath C:\poppler ; ^
    Remove-Item poppler.zip

ENV PATH="C:\Program Files\Tesseract-OCR;C:\poppler\Library\bin;%PATH%"

# -----------------------------------------------------------------------------
# Copy requirements first
# -----------------------------------------------------------------------------

COPY requirements.txt .

# -----------------------------------------------------------------------------
# Install Python packages
# -----------------------------------------------------------------------------

RUN pip install --no-cache-dir -r requirements.txt

# -----------------------------------------------------------------------------
# Verify installation
# -----------------------------------------------------------------------------

RUN python -c "import numpy;print('NumPy OK:',numpy.__version__)"
RUN python -c "import thinc;print('Thinc OK:',thinc.__version__)"
RUN python -c "import spacy;print('spaCy OK:',spacy.__version__)"

# -----------------------------------------------------------------------------
# Download spaCy models
# -----------------------------------------------------------------------------



# -----------------------------------------------------------------------------
# Copy project
# -----------------------------------------------------------------------------

COPY . .

# -----------------------------------------------------------------------------
# Expose FastAPI port
# -----------------------------------------------------------------------------

EXPOSE 8002

# -----------------------------------------------------------------------------
# Start application
# -----------------------------------------------------------------------------

CMD ["python","run.py"]