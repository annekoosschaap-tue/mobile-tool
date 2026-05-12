import { useEffect, useRef, useState } from "react";
import { supabase } from "./SupabaseClient";

import "@kitware/vtk.js/favicon";
import "@kitware/vtk.js/Rendering/Profiles/Geometry";

import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkSTLReader from "@kitware/vtk.js/IO/Geometry/STLReader";
import vtkPolyDataNormals from "@kitware/vtk.js/Filters/Core/PolyDataNormals";
import vtkFullScreenRenderWindow from "@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow";

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

      rendererRef.current = renderer;
      renderWindowRef.current = renderWindow;

      const reader = vtkSTLReader.newInstance();
      const mapper = vtkMapper.newInstance({ scalarVisibility: false });
      const actor = vtkActor.newInstance();

      const normals = vtkPolyDataNormals.newInstance();
      normals.setInputConnection(reader.getOutputPort());

      mapper.setInputConnection(normals.getOutputPort());
      actor.setMapper(mapper);

      // Rotate upside-down STL
      actor.rotateX(180);

      renderer.addActor(actor);

      const camera = renderer.getActiveCamera();
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
    const renderWindow = renderWindowRef.current;

    camera.setPosition(...state.position);
    camera.setFocalPoint(...state.focalPoint);
    camera.setViewUp(...state.viewUp);

    renderWindow.render();
  };

  // ---------------------------
  // Annotation actions
  // ---------------------------
  const saveAnnotation = async () => {
    const cam = getCameraState();

    const renderWindow = renderWindowRef.current;

    // Ensure latest frame is rendered
    renderWindow.render();

    // Capture screenshot from vtk.js
    const screenshot = await renderWindow.captureImages()[0];

    const { error } = await supabase.from("annotations").insert([
      {
        user_id: userId,
        patient_id: patientId,
        camera_position: cam.position,
        camera_focal_point: cam.focalPoint,
        camera_view_up: cam.viewUp,
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
          Previous
        </button>
        <button onClick={saveAnnotation}>Save view</button>
        <button onClick={onNext}>
          {isLast ? "Finish" : "Next"}
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
                position: a.camera_position,
                focalPoint: a.camera_focal_point,
                viewUp: a.camera_view_up,
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