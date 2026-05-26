import { useEffect, useRef, useState } from "react";
import { supabase } from "./SupabaseClient";

import "@kitware/vtk.js/favicon";
import "@kitware/vtk.js/Rendering/Profiles/Geometry";
import "@kitware/vtk.js/Rendering/Profiles/Volume";

import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkSTLReader from "@kitware/vtk.js/IO/Geometry/STLReader";
import vtkPolyDataNormals from "@kitware/vtk.js/Filters/Core/PolyDataNormals";
import vtkFullScreenRenderWindow from "@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow";
import vtkRenderWindowInteractor from "@kitware/vtk.js/Rendering/Core/RenderWindowInteractor";
import vtkOpenGLRenderWindow from "@kitware/vtk.js/Rendering/OpenGL/RenderWindow";
import vtkXMLImageDataReader from "@kitware/vtk.js/IO/XML/XMLImageDataReader";
import vtkInteractorStyleArcballCamera from './InteractorStyleArcballCamera';
import vtkImageMarchingCubes from "@kitware/vtk.js/Filters/General/ImageMarchingCubes";
import vtkBoundingBox from "@kitware/vtk.js/Common/DataModel/BoundingBox";


const NUMBER_OF_PATIENTS = parseInt(process.env.REACT_APP_NUMBER_OF_PATIENTS || 3);
const NUMBER_OF_PROJECTIONS = parseInt(process.env.REACT_APP_NUMBER_OF_ANNOTATIONS || 2);

function STLViewer({ userId, patientId, patientIndex, onNext, onPrevious, isLast, isFirst }) {
  const containerRef = useRef(null);

  const [annotations, setAnnotations] = useState([]);

  // Store VTK objects so we can access them outside useEffect
  const rendererRef = useRef(null);
  const renderWindowRef = useRef(null);
  const cameraRef = useRef(null);

  const marchingCubeRef = useRef(null);
  const [scalarRange, setScalarRange] = useState([0, 1000]);

  // ---------------------------
  // Fetch annotations
  // ---------------------------
  const fetchAnnotations = async () => {
    const { data, error } = await supabase
      .from("annotations")
      .select("*")
      .eq("user_id", userId)
      .eq("patient_id", patientId);

    setAnnotations(data || []);
  };

  useEffect(() => {
    fetchAnnotations();
  }, [patientId]);

  // ---------------------------
  // VTK setup
  // ---------------------------
  useEffect(() => {
    if (!containerRef.current) return;

    let fullScreenRenderer = null;

    requestAnimationFrame(() => {
      if (!containerRef.current) return;

      fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
        rootContainer: containerRef.current,
        background: [0.1, 0.1, 0.1],
      });

      const renderer = fullScreenRenderer.getRenderer();
      const renderWindow = fullScreenRenderer.getRenderWindow();

      const interactor = fullScreenRenderer.getInteractor();
      interactor.setInteractorStyle(
        vtkInteractorStyleArcballCamera.newInstance()
      );

      rendererRef.current = renderer;
      renderWindowRef.current = renderWindow;

      const reader = vtkXMLImageDataReader.newInstance();

      const marchingCube = vtkImageMarchingCubes.newInstance({
        contourValue: 100,
        computeNormals: true,
        mergePoints: true,
      });

      marchingCube.setInputConnection(reader.getOutputPort());

      const mapper = vtkMapper.newInstance();
      mapper.setInputConnection(marchingCube.getOutputPort());

      const actor = vtkActor.newInstance();
      actor.setMapper(mapper);
      actor.getProperty().setColor(1, 1, 1);

      renderer.addActor(actor);

      marchingCubeRef.current = marchingCube;

      const camera = renderer.getActiveCamera();
      camera.setPosition(0, 0, -1);
      camera.setFocalPoint(0, 0, 0);
      camera.setViewUp(0, -1, 0);
      camera.setParallelProjection(true);
      cameraRef.current = camera;

      fetch(`${process.env.PUBLIC_URL}/aneurisk-nifti/${patientId}/3DRA.vti`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load VTI");
          return res.arrayBuffer();
        })
        .then((arrayBuffer) => {

          reader.parseAsArrayBuffer(arrayBuffer);

          const imageData = reader.getOutputData(0);

          // const sampleDistance =
          //   0.7 *
          //   Math.sqrt(
          //     imageData
          //       .getSpacing()
          //       .map((v) => v * v)
          //       .reduce((a, b) => a + b, 0)
          //   );

          // mapper.setSampleDistance(sampleDistance);

          console.log(
            "Dimensions:",
            imageData.getDimensions()
          );

          console.log(
            "Bounds:",
            imageData.getBounds()
          );

          const range =
            imageData
              .getPointData()
              .getScalars()
              .getRange();

          console.log("Scalar range:", range);

          setScalarRange(range);

          const initialIso =
            (range[0] + range[1]) / 3;

          marchingCube.setContourValue(initialIso);

          renderer.resetCamera();
          renderWindow.render();
        })
        .catch(console.error);
    });

    return () => {
      if (fullScreenRenderer) {
        fullScreenRenderer.delete();
      }
    };
  }, [patientId]);

  function updateThreshold(value) {
    const marchingCube =
      marchingCubeRef.current;

    const renderWindow =
      renderWindowRef.current;

    if (!marchingCube || !renderWindow)
      return;

    marchingCube.setContourValue(
      Number(value)
    );

    renderWindow.render();
  }

  // ---------------------------
  // Camera helpers
  // ---------------------------
  const getCameraState = () => {
    const camera = cameraRef.current;
    return {
      position: camera.getPosition(),
      focalPoint: camera.getFocalPoint(),
      viewUp: camera.getViewUp(),
    };
  };

  const setCameraState = (state) => {
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const renderWindow = renderWindowRef.current;

    // Assume focal point is always [0, 0, 0]
    const focalPoint = [0, 0, 0];

    const cameraPosition = [
      focalPoint[0] - state.viewVector[0],
      focalPoint[1] - state.viewVector[1],
      focalPoint[2] - state.viewVector[2],
    ];

    camera.setPosition(...cameraPosition);

    camera.setFocalPoint(...focalPoint);

    renderer.resetCamera();
    renderWindow.render();
  };

  function getCameraViewAngles(renderer) {
    const camera = renderer.getActiveCamera();

    const position = camera.getPosition();
    const focalPoint = camera.getFocalPoint();
    const viewUp = camera.getViewUp();

    // Calculate view direction vector
    const viewDirection = [
      focalPoint[0] - position[0],
      focalPoint[1] - position[1],
      focalPoint[2] - position[2],
    ];

    const norm = Math.sqrt(
      viewDirection.reduce((sum, val) => sum + val * val, 0)
    );

    const normalizedDirection = viewDirection.map(
      (val) => val / norm
    );

    return {
      position,
      focalPoint,
      viewUp,
      viewVector: normalizedDirection,
    };
  }

  function handleReset() {
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const renderWindow = renderWindowRef.current;

    // Reset to initial camera view (manual or default)
    camera.setPosition(0, 0, -1);
    camera.setFocalPoint(0, 0, 0);
    camera.setViewUp(0, -1, 0);
    renderer.resetCamera()
    renderWindow.render();
  }

  function handleInvert() {
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const renderWindow = renderWindowRef.current;

    // Invert the current camera view
    const position = camera.getPosition();
    const focalPoint = camera.getFocalPoint();

    // New position = focalPoint + (focalPoint - position)
    const invertedPosition = [
      focalPoint[0] * 2 - position[0],
      focalPoint[1] * 2 - position[1],
      focalPoint[2] * 2 - position[2],
    ];

    camera.setPosition(...invertedPosition);

    // Keep focal point unchanged
    camera.setFocalPoint(...focalPoint);

    // Optional but recommended: keep a consistent "up"
    camera.setViewUp(0, -1, 0);

    camera.modified();
    renderer.resetCameraClippingRange();
    renderWindow.render();
  }

  function computeRAOAndCRAN(viewDirection) {
    const [x, y, z] = viewDirection;

    // Compute RAO and CRAN in degrees
    const rao = Math.atan2(x, z) * 180 / Math.PI;   // positive x = RAO, negative x = LAO
    const cran = Math.atan2(y, Math.sqrt(x*x + z*z)) * 180 / Math.PI;   // positive y = CRAN, negative y = CAUD

    return {
      rao: parseFloat(rao.toFixed(1)),
      cran: parseFloat(cran.toFixed(1))
    };
  }

  // ---------------------------
  // Annotation actions
  // ---------------------------
  const saveAnnotation = async () => {
    const cam = getCameraState();

    const renderWindow = renderWindowRef.current;
    const renderer = rendererRef.current;

    const { viewVector } = getCameraViewAngles(renderer);

    // Ensure latest frame is rendered
    renderWindow.render();

    // Capture screenshot from vtk.js
    const screenshot = await renderWindow.captureImages()[0];

    const { error } = await supabase.from("annotations").insert([
      {
        user_id: userId,
        patient_id: patientId,
        view_vector: viewVector,
        screenshot: screenshot,
      },
    ]);

    if (error) {
      console.error(error);
    }

    fetchAnnotations();
  };

  const deleteAnnotation = async (id) => {
    await supabase.from("annotations").delete().eq("id", id);
    fetchAnnotations();
  };

  const canProceed =
  annotations.length >= NUMBER_OF_PROJECTIONS;

  // ---------------------------
  // UI
  // ---------------------------
  return (
    <div className="vtk-wrapper">
      <div ref={containerRef} className="vtk-container" />

      <div className="patient-id-overlay">
        Case ID: {patientId} ({patientIndex+1}/{NUMBER_OF_PATIENTS})
      </div>

      {/* Controls */}
      <div className="viewer-controls">
        <button
          onClick={onPrevious}
          disabled={isFirst}
        >
          Previous case
        </button>
        <button onClick={handleReset}>Reset view</button>
        <button onClick={handleInvert}>Invert view</button>
        <button onClick={saveAnnotation}>Save view</button>
        <button
          onClick={onNext}
          disabled={!canProceed}
        >
          {isLast ? "Finish" : "Next case"}
        </button>

        <input
          type="range"
          min={scalarRange[0]}
          max={scalarRange[1]}
          step="1"
          defaultValue={
            (scalarRange[0] +
              scalarRange[1]) /
            3
          }
          onChange={(e) =>
            updateThreshold(
              Number(e.target.value)
            )
          }
        />
      </div>

      

      {/* Bottom sheet */}
      <div className="bottom-sheet">
        {annotations.map((a) => (
          <div
            key={a.id}
            className="annotation-card"
            onClick={() =>
              setCameraState({
                viewVector: a.view_vector,
              })
            }
          >
            {/* Thumbnail */}
            <img
              src={a.screenshot}
              alt="Saved projection"
              className="annotation-thumbnail"
            />

            {/* Delete button */}
            <button
              className="delete-annotation"
              onClick={(e) => {
                e.stopPropagation();
                deleteAnnotation(a.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default STLViewer;