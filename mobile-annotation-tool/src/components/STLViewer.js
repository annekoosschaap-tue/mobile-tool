import { useEffect, useRef } from "react";

import "@kitware/vtk.js/favicon";
import "@kitware/vtk.js/Rendering/Profiles/Geometry";

import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkSTLReader from "@kitware/vtk.js/IO/Geometry/STLReader";
import vtkPolyDataNormals from "@kitware/vtk.js/Filters/Core/PolyDataNormals";
import vtkFullScreenRenderWindow from "@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow";

function STLViewer({ userId }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // ---------------------------
    // Renderer setup
    // ---------------------------
    const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
      rootContainer: containerRef.current,
      background: [0.1, 0.1, 0.1],
    });

    const renderer = fullScreenRenderer.getRenderer();
    const renderWindow = fullScreenRenderer.getRenderWindow();

    // ---------------------------
    // VTK pipeline (your example)
    // ---------------------------
    const reader = vtkSTLReader.newInstance();
    const mapper = vtkMapper.newInstance({ scalarVisibility: false });
    const actor = vtkActor.newInstance();

    const normals = vtkPolyDataNormals.newInstance();
    normals.setInputConnection(reader.getOutputPort());

    mapper.setInputConnection(normals.getOutputPort());
    actor.setMapper(mapper);

    renderer.addActor(actor);

    function update() {
      renderer.resetCamera();
      renderWindow.render();
    }

    // ---------------------------
    // Load STL from public folder
    // ---------------------------
    fetch("/C0001.stl")
      .then((res) => res.arrayBuffer())
      .then((arrayBuffer) => {
        reader.parseAsArrayBuffer(arrayBuffer);
        update();
      });

    // ---------------------------
    // Cleanup (IMPORTANT in React)
    // ---------------------------
    return () => {
      fullScreenRenderer.delete();
    };
  }, []);

    return (
    <div className="vtk-wrapper">
        <div ref={containerRef} className="vtk-container" />
    </div>
    );
}

export default STLViewer;