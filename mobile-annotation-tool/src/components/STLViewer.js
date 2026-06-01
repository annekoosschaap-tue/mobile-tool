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


const NUMBER_OF_PATIENTS = parseInt(process.env.REACT_APP_NUMBER_OF_PATIENTS || 3);
const NUMBER_OF_PROJECTIONS = parseInt(process.env.REACT_APP_NUMBER_OF_ANNOTATIONS || 2);
const TREATMENT_TEXT_MAP = {
    "coiling": "coiling",
    "stent_assisted_coiling": "stent-assisted coiling",
    "flow_diverter": "flow diverter",
    "intrasaccular_device": "intrasaccular device",
  };

function STLViewer({ userId, patientId, patientIndex, treatmentType, onNext, onPrevious, isLast, isFirst }) {
  const containerRef = useRef(null);

  const [annotations, setAnnotations] = useState([]);

  const TREATMENT_TEXT = treatmentType
  ? TREATMENT_TEXT_MAP[treatmentType]
  : null;

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

      fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
        rootContainer: containerRef.current,
        background: [0.9, 0.9, 0.9],
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

      const mapper = vtkMapper.newInstance();

      const actor = vtkActor.newInstance();

      const normals = vtkPolyDataNormals.newInstance();
      normals.setInputConnection(reader.getOutputPort());

      mapper.setInputConnection(normals.getOutputPort());

      actor.setMapper(mapper);

      renderer.addActor(actor);

      const camera = renderer.getActiveCamera();
      camera.setPosition(0, 1, 0);
      camera.setFocalPoint(0, 0, 0);
      camera.setViewUp(0, 0, 1);
      camera.setParallelProjection(true);
      cameraRef.current = camera;

      Promise.allSettled([
        fetch(`${process.env.PUBLIC_URL}/cases/${patientId}_seg00002.stl`), // vessels
        fetch(`${process.env.PUBLIC_URL}/cases/${patientId}_seg00001.stl`), // aneurysm 1
        fetch(`${process.env.PUBLIC_URL}/cases/${patientId}_seg00003.stl`)  // aneurysm 2 (optional)
      ])
        .then(async ([vesselResult, aneurysm1Result, aneurysm2Result]) => {
          if (
            vesselResult.status !== "fulfilled" ||
            !vesselResult.value.ok
          ) {
            throw new Error("Failed vessel STL");
          }

          if (
            aneurysm1Result.status !== "fulfilled" ||
            !aneurysm1Result.value.ok
          ) {
            throw new Error("Failed aneurysm STL");
          }

          const vesselBuffer = await vesselResult.value.arrayBuffer();
          const aneurysm1Buffer = await aneurysm1Result.value.arrayBuffer();

          let aneurysm2Buffer = null;
          if (
            aneurysm2Result.status === "fulfilled" &&
            aneurysm2Result.value.ok
          ) {
            aneurysm2Buffer = await aneurysm2Result.value.arrayBuffer();
          }

          return { vesselBuffer, aneurysm1Buffer, aneurysm2Buffer };
        })
        .then(({ vesselBuffer, aneurysm1Buffer, aneurysm2Buffer }) => {
          // Vessel
          const vesselReader = vtkSTLReader.newInstance();
          vesselReader.parseAsArrayBuffer(vesselBuffer);

          const vesselMapper = vtkMapper.newInstance();
          vesselMapper.setInputConnection(vesselReader.getOutputPort());

          const vesselActor = vtkActor.newInstance();
          vesselActor.setMapper(vesselMapper);
          vesselActor.getProperty().setColor(9 / 255, 94 / 255, 215 / 255);

          renderer.addActor(vesselActor);

          // Aneurysm 1 (red)
          const aneurysm1Reader = vtkSTLReader.newInstance();
          aneurysm1Reader.parseAsArrayBuffer(aneurysm1Buffer);

          const aneurysm1Mapper = vtkMapper.newInstance();
          aneurysm1Mapper.setInputConnection(
            aneurysm1Reader.getOutputPort()
          );

          const aneurysm1Actor = vtkActor.newInstance();
          aneurysm1Actor.setMapper(aneurysm1Mapper);
          aneurysm1Actor.getProperty().setColor(
            200 / 255,
            25 / 255,
            25 / 255
          );
          aneurysm1Actor.getProperty().setSpecular(0.6);
          aneurysm1Actor.getProperty().setSpecularPower(20);

          renderer.addActor(aneurysm1Actor);

          // Optional aneurysm 2 (turquoise)
          if (aneurysm2Buffer) {
            console.log("aneurysm 2 detected");
            const aneurysm2Reader = vtkSTLReader.newInstance();
            aneurysm2Reader.parseAsArrayBuffer(aneurysm2Buffer);

            const aneurysm2Mapper = vtkMapper.newInstance();
            aneurysm2Mapper.setInputConnection(
              aneurysm2Reader.getOutputPort()
            );

            const aneurysm2Actor = vtkActor.newInstance();
            aneurysm2Actor.setMapper(aneurysm2Mapper);
            aneurysm2Actor.getProperty().setColor(
              64 / 255,
              224 / 255,
              208 / 255
            ); // turquoise
            aneurysm2Actor.getProperty().setSpecular(0.6);
            aneurysm2Actor.getProperty().setSpecularPower(20);

            renderer.addActor(aneurysm2Actor);
          }

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
    camera.setPosition(0, 1, 0);
    camera.setFocalPoint(0, 0, 0);
    camera.setViewUp(0, 0, 1);
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
    camera.setViewUp(0, 0, 1);

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
        treatment_type: treatmentType,
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

      <div className="top-overlay">
        <div className="viewer-controls">
          <button onClick={onPrevious} disabled={isFirst}>
            Previous case
          </button>

          <button onClick={handleReset}>Reset view</button>
          <button onClick={handleInvert}>Invert view</button>
          <button onClick={saveAnnotation}>Save view</button>

          <button onClick={onNext} disabled={!canProceed}>
            {isLast ? "Finish" : "Next case"}
          </button>
        </div>

        <div className="patient-id-overlay">
          Case ID: {patientId} ({patientIndex + 1}/{NUMBER_OF_PATIENTS}),
          treatment: {TREATMENT_TEXT},
          monoplane projections: ({annotations.length}/{NUMBER_OF_PROJECTIONS})
        </div>
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