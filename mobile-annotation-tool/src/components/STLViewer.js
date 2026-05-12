import { useEffect, useRef, useState } from "react";
import { supabase } from "./SupabaseClient";

import "@kitware/vtk.js/favicon";
import "@kitware/vtk.js/Rendering/Profiles/Geometry";

import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkSTLReader from "@kitware/vtk.js/IO/Geometry/STLReader";
import vtkPolyDataNormals from "@kitware/vtk.js/Filters/Core/PolyDataNormals";
import vtkFullScreenRenderWindow from "@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow";
import vtkRenderWindowInteractor from "@kitware/vtk.js/Rendering/Core/RenderWindowInteractor";
import vtkOpenGLRenderWindow from "@kitware/vtk.js/Rendering/OpenGL/RenderWindow";

import vtkInteractorStyleArcballCamera from './InteractorStyleArcballCamera';

function STLViewer({ userId, patientId, onNext, onPrevious, isLast, isFirst }) {
  const containerRef = useRef(null);

  const [annotations, setAnnotations] = useState([]);

  // Store VTK objects so we can access them outside useEffect
  const rendererRef = useRef(null);
  const renderWindowRef = useRef(null);
  const cameraRef = useRef(null);

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

      const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
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

      const reader = vtkSTLReader.newInstance();
      const mapper = vtkMapper.newInstance({ scalarVisibility: false });
      const actor = vtkActor.newInstance();

      const normals = vtkPolyDataNormals.newInstance();
      normals.setInputConnection(reader.getOutputPort());

      mapper.setInputConnection(normals.getOutputPort());
      actor.setMapper(mapper);

      renderer.addActor(actor);

      const camera = renderer.getActiveCamera();
      camera.setPosition(0, 0, -1);
      camera.setFocalPoint(0, 0, 0);
      camera.setViewUp(0, -1, 0);
      camera.setParallelProjection(true);
      cameraRef.current = camera;

      fetch(`${process.env.PUBLIC_URL}/cases/${patientId}.stl`)
        .then((res) => {
          if (!res.ok) {
            throw new Error("Failed to load STL");
          }

          return res.arrayBuffer();
        })
        .then((arrayBuffer) => {
          reader.parseAsArrayBuffer(arrayBuffer);

          renderer.resetCamera();
          renderWindow.render();
        })
        .catch((err) => {
          console.error(err);
        });
      });

    return () => {
      if (fullScreenRenderer) {
        fullScreenRenderer.delete();
      }
    };
  }, [patientId]);

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

  // ---------------------------
  // UI
  // ---------------------------
  return (
    <div className="vtk-wrapper">
      <div ref={containerRef} className="vtk-container" />

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
        <button onClick={onNext}>
          {isLast ? "Finish" : "Next case"}
        </button>
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