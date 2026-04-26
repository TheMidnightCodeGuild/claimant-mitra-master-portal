import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../lib/firebase";

export default function RequestVerificationPage() {
  const router = useRouter();
  const { id } = router.query;

  const [caseData, setCaseData] = useState(null);
  const [loadingCase, setLoadingCase] = useState(true);
  const [error, setError] = useState("");
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [successMessage, setSuccessMessage] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMarqueeRunning, setIsMarqueeRunning] = useState(true);
  const [marqueeKey, setMarqueeKey] = useState(0);
  const [marqueeManualOffsetPx, setMarqueeManualOffsetPx] = useState(0);
  const [marqueeDragging, setMarqueeDragging] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const marqueeDragStartRef = useRef({ startX: 0, startOffset: 0 });

  useEffect(() => {
    async function fetchCase() {
      if (!id) return;
      setLoadingCase(true);
      setError("");

      try {
        const docRef = doc(db, "users", id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          setError("Invalid verification link. Case not found.");
          return;
        }

        setCaseData(docSnap.data());
      } catch (err) {
        console.error("Error fetching case for verification:", err);
        setError("Failed to load verification request.");
      } finally {
        setLoadingCase(false);
      }
    }

    fetchCase();
  }, [id]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const totalSelectedFiles = useMemo(
    () => images.length + videos.length,
    [images.length, videos.length]
  );

  const imagePreviewUrls = useMemo(
    () =>
      images.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [images]
  );

  const videoPreviewUrls = useMemo(
    () =>
      videos.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [videos]
  );

  useEffect(() => {
    return () => {
      imagePreviewUrls.forEach((item) => URL.revokeObjectURL(item.url));
      videoPreviewUrls.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [imagePreviewUrls, videoPreviewUrls]);

  const removeImageAt = (indexToRemove) => {
    setImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const removeVideoAt = (indexToRemove) => {
    setVideos((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const verificationMonologue = useMemo(() => {
    const scriptData = caseData?.requestVerificationScriptData || {};
    const name = scriptData.name || caseData?.name || "N/A";
    const insuranceCompany =
      scriptData.insuranceCompany || caseData?.companyName || "____";
    const claimNo = scriptData.claimNo || caseData?.claimNo || "N/A";
    const policyNo = scriptData.policyNo || caseData?.policyNo || "N/A";
    const hospitalName = scriptData.hospitalName || "____";
    const claimAmount =
      scriptData.claimAmount ||
      caseData?.estimatedClaimAmount?.toString() ||
      caseData?.claim?.toString() ||
      "____";
    return `1. मेरा नाम "${name}" है।
2. मेरी ${insuranceCompany} Insurance Company की पॉलिसी है।
3. मेरा Claim No. "${claimNo}" तथा Policy No. "${policyNo}" है।
4. बीमा कंपनी ने मेरे ${hospitalName} Hospital के ₹${claimAmount} के क्लेम को अस्वीकृत कर दिया है।
5. मुझे क्लेम प्रक्रिया की पूरी जानकारी नहीं है।
6. इसलिए मैं CLAIMANT MITRA को अपना अधिकृत सलाहकार नियुक्त करता/करती हूँ।
7. मैं यह शपथपूर्वक स्वीकार करता/करती हूँ कि सफल क्लेम राशि प्राप्त होने पर मैं CLAIMANT MITRA को क्लेम राशि का 20% शुल्क प्रदान करूँगा/करूँगी।
8. यदि प्रक्रिया के दौरान मेरी ओर से किसी दस्तावेज़ में कमी, त्रुटि या तथ्य छुपाने के कारण क्लेम अस्वीकृत होता है, तो उसकी पूर्ण जिम्मेदारी मेरी स्वयं की होगी।
9. मैं अपनी सहमति से यह घोषणा कर रहा/रही हूँ।`;
  }, [
    caseData?.requestVerificationScriptData,
    caseData?.name,
    caseData?.claimNo,
    caseData?.policyNo,
    caseData?.companyName,
    caseData?.estimatedClaimAmount,
    caseData?.claim,
  ]);

  const verificationMonologueMarquee = useMemo(
    () => verificationMonologue.replace(/\s*\n\s*/g, " "),
    [verificationMonologue]
  );

  const handleStartScript = () => setIsMarqueeRunning(true);
  const handlePauseScript = () => setIsMarqueeRunning(false);
  const handleReloadScript = () => {
    setMarqueeManualOffsetPx(0);
    setMarqueeKey((prev) => prev + 1);
    setIsMarqueeRunning(true);
  };

  const handleMarqueePointerDown = (clientX) => {
    setMarqueeDragging(true);
    setIsMarqueeRunning(false);
    marqueeDragStartRef.current = {
      startX: clientX,
      startOffset: marqueeManualOffsetPx,
    };
  };

  const handleMarqueePointerMove = (clientX) => {
    if (!marqueeDragging) return;
    const deltaX = clientX - marqueeDragStartRef.current.startX;
    setMarqueeManualOffsetPx(marqueeDragStartRef.current.startOffset + deltaX);
  };

  const handleMarqueePointerUp = () => {
    setMarqueeDragging(false);
  };

  const startCamera = async () => {
    setError("");
    setSuccessMessage("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraReady(true);
    } catch (err) {
      console.error("Error opening camera:", err);
      setError("Unable to access camera. Please allow camera permission.");
    }
  };

  const stopCamera = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
    setIsRecording(false);
  };

  const captureImage = async () => {
    if (!videoRef.current) {
      setError("Camera is not ready.");
      return;
    }

    const videoElement = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = videoElement.videoWidth || 1280;
    canvas.height = videoElement.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("Failed to capture image.");
      return;
    }
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    const imageBlob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!imageBlob) {
      setError("Failed to capture image.");
      return;
    }

    const imageFile = new File([imageBlob], `camera-image-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    setImages((prev) => [...prev, imageFile]);
    setSuccessMessage("Image captured.");
    setError("");
  };

  const startVideoRecording = () => {
    if (!streamRef.current) {
      setError("Please open camera first.");
      return;
    }

    try {
      recordingChunksRef.current = [];
      const recorder = new MediaRecorder(streamRef.current);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const videoBlob = new Blob(recordingChunksRef.current, {
          type: "video/webm",
        });
        if (videoBlob.size > 0) {
          const videoFile = new File(
            [videoBlob],
            `camera-video-${Date.now()}.webm`,
            { type: "video/webm" }
          );
          setVideos((prev) => [...prev, videoFile]);
          setSuccessMessage("Video recorded.");
        }
        setIsRecording(false);
      };

      recorder.start();
      setIsRecording(true);
      setError("");
      setSuccessMessage("");
    } catch (err) {
      console.error("Error starting video recording:", err);
      setError("Failed to start recording.");
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleUpload = async () => {
    if (!id) {
      setError("Invalid case ID.");
      return;
    }

    if (totalSelectedFiles === 0) {
      setError("Please capture at least one image or video.");
      return;
    }

    setError("");
    setSuccessMessage("");
    setUploading(true);
    setUploadedCount(0);

    try {
      const filesToUpload = [
        ...images.map((file) => ({ file, category: "image" })),
        ...videos.map((file) => ({ file, category: "video" })),
      ];

      const uploadedItems = [];

      for (const item of filesToUpload) {
        const originalName = item.file.name || `${item.category}-${Date.now()}`;
        const safeName = originalName.replace(/\s+/g, "_");
        const storagePath = `requestVerification/${id}/${Date.now()}_${safeName}`;
        const storageRef = ref(storage, storagePath);

        await uploadBytes(storageRef, item.file);
        const downloadUrl = await getDownloadURL(storageRef);

        uploadedItems.push({
          path: storagePath,
          url: downloadUrl,
          type: item.file.type || item.category,
          name: originalName,
          uploadedAt: new Date().toISOString(),
        });

        setUploadedCount((prev) => prev + 1);
      }

      const userDocRef = doc(db, "users", id);
      await updateDoc(userDocRef, {
        requestVerificationFiles: arrayUnion(...uploadedItems),
        requestVerificationUpdatedAt: new Date().toISOString(),
        VideoVerification: "Uploaded",
      });

      setImages([]);
      setVideos([]);
      setSuccessMessage(
        `Uploaded ${uploadedItems.length} file${
          uploadedItems.length > 1 ? "s" : ""
        } successfully.`
      );

      setTimeout(() => {
        window.location.assign("https://www.claimantmitra.com/");
      }, 900);
    } catch (err) {
      console.error("Error uploading verification files:", err);
      setError("Failed to upload files. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (loadingCase) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error && !caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-red-600 text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-bold mb-2">Request Verification</h1>
      <p className="text-gray-600 mb-6">
        Please capture and upload verification media for this case.
      </p>

      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleStartScript}
            className="px-3 py-2 rounded text-white bg-green-600 hover:bg-green-700 text-sm"
          >
            Start Script
          </button>
          <button
            type="button"
            onClick={handlePauseScript}
            className="px-3 py-2 rounded text-white bg-gray-600 hover:bg-gray-700 text-sm"
          >
            Pause Script
          </button>
          <button
            type="button"
            onClick={handleReloadScript}
            className="px-3 py-2 rounded text-white bg-blue-600 hover:bg-blue-700 text-sm"
          >
            Reload Script
          </button>
          <p className="text-xs text-gray-500 self-center">
            Tip: swipe/drag on the script to reposition it.
          </p>
        </div>

        <div
          className="overflow-hidden rounded border border-blue-200 bg-blue-50 marquee-surface"
          onMouseDown={(e) => handleMarqueePointerDown(e.clientX)}
          onMouseMove={(e) => handleMarqueePointerMove(e.clientX)}
          onMouseUp={handleMarqueePointerUp}
          onMouseLeave={handleMarqueePointerUp}
          onTouchStart={(e) => handleMarqueePointerDown(e.touches[0]?.clientX || 0)}
          onTouchMove={(e) => handleMarqueePointerMove(e.touches[0]?.clientX || 0)}
          onTouchEnd={handleMarqueePointerUp}
          role="region"
          aria-label="Verification script marquee"
        >
          <div style={{ transform: `translateX(${marqueeManualOffsetPx}px)` }}>
            <div
              key={marqueeKey}
              className="whitespace-nowrap py-2 marquee-track"
              style={{ animationPlayState: isMarqueeRunning ? "running" : "paused" }}
            >
              <span className="inline-block px-4 text-sm font-medium text-blue-900 marquee-text">
                {verificationMonologueMarquee}
              </span>
              <span
                className="inline-block px-4 text-sm font-medium text-blue-900 marquee-text"
                aria-hidden="true"
              >
                {verificationMonologueMarquee}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 space-y-5">
        <div>
          <p className="text-sm text-gray-500">Case ID</p>
          <p className="font-medium">{id}</p>
          {caseData?.name ? (
            <>
              <p className="text-sm text-gray-500 mt-2">Name</p>
              <p className="font-medium">{caseData.name}</p>
            </>
          ) : null}
        </div>

        {error ? <p className="text-red-600 text-sm">{error}</p> : null}
        {successMessage ? (
          <p className="text-green-600 text-sm">{successMessage}</p>
        ) : null}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Camera</label>
          <div className="space-y-3">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded border bg-black"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={startCamera}
                disabled={cameraReady}
                className={`px-3 py-2 rounded text-white ${
                  cameraReady ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                Open Camera
              </button>
              <button
                type="button"
                onClick={stopCamera}
                disabled={!cameraReady}
                className={`px-3 py-2 rounded text-white ${
                  !cameraReady ? "bg-gray-400" : "bg-gray-600 hover:bg-gray-700"
                }`}
              >
                Close Camera
              </button>
              <button
                type="button"
                onClick={captureImage}
                disabled={!cameraReady || isRecording}
                className={`px-3 py-2 rounded text-white ${
                  !cameraReady || isRecording
                    ? "bg-gray-400"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                Capture Photo
              </button>
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startVideoRecording}
                  disabled={!cameraReady}
                  className={`px-3 py-2 rounded text-white ${
                    !cameraReady ? "bg-gray-400" : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  Start Video
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopVideoRecording}
                  className="px-3 py-2 rounded text-white bg-red-800 hover:bg-red-900"
                >
                  Stop Video
                </button>
              )}
            </div>
            <p className="text-sm text-gray-600">
              Captured: {images.length} image{images.length === 1 ? "" : "s"},{" "}
              {videos.length} video{videos.length === 1 ? "" : "s"}.
            </p>
          </div>
        </div>

        {totalSelectedFiles > 0 ? (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <h3 className="text-sm font-semibold text-gray-800">
                Selected Media Preview
              </h3>
              <p className="text-xs text-gray-500">
                Remove any item before uploading
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {imagePreviewUrls.map((item, index) => (
                <div
                  key={`img-${item.file.name}-${item.file.lastModified}-${index}`}
                  className="border rounded p-2 bg-gray-50 space-y-2"
                >
                  <img
                    src={item.url}
                    alt={item.file.name || `Captured image ${index + 1}`}
                    className="w-full h-44 sm:h-40 object-cover rounded border bg-white"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-600 truncate">
                      {item.file.name || `Image ${index + 1}`}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeImageAt(index)}
                      className="px-3 py-1 rounded text-white bg-red-600 hover:bg-red-700 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {videoPreviewUrls.map((item, index) => (
                <div
                  key={`vid-${item.file.name}-${item.file.lastModified}-${index}`}
                  className="border rounded p-2 bg-gray-50 space-y-2"
                >
                  <video
                    src={item.url}
                    controls
                    className="w-full h-44 sm:h-40 object-cover rounded border bg-black"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-600 truncate">
                      {item.file.name || `Video ${index + 1}`}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeVideoAt(index)}
                      className="px-3 py-1 rounded text-white bg-red-600 hover:bg-red-700 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading}
          className={`w-full py-2 px-4 rounded text-white font-medium ${
            uploading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {uploading
            ? `Uploading (${uploadedCount}/${totalSelectedFiles})...`
            : "Upload Verification Media"}
        </button>
      </div>

      <style jsx>{`
        .marquee-surface {
          touch-action: pan-y;
          user-select: none;
        }

        .marquee-track {
          display: inline-flex;
          min-width: 100%;
          /* Slow marquee speed */
          animation: verificationMarquee 120s linear infinite;
        }

        .marquee-text {
          padding-right: 2rem;
        }

        @keyframes verificationMarquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
