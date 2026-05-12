import vtkInteractorStyleTrackballCamera from '@kitware/vtk.js/Interaction/Style/InteractorStyleTrackballCamera';
import * as vtkMath from '@kitware/vtk.js/Common/Core/Math';
import * as macro from '@kitware/vtk.js/macros';


function clamp(x, min, max) {
  return Math.max(min, Math.min(max, x));
}

// Rodrigues' rotation formula: rotate vec around axis by angle (radians)
function rotateAroundAxis(vec, axis, angle) {
  const v = [...vec];
  const k = [...axis];
  vtkMath.normalize(k);

  const c = Math.cos(angle);
  const s = Math.sin(angle);

  // k x v
  const cross = [
    k[1] * v[2] - k[2] * v[1],
    k[2] * v[0] - k[0] * v[2],
    k[0] * v[1] - k[1] * v[0],
  ];
  const dot = vtkMath.dot(v, k);

  return [
    v[0] * c + cross[0] * s + k[0] * dot * (1 - c),
    v[1] * c + cross[1] * s + k[1] * dot * (1 - c),
    v[2] * c + cross[2] * s + k[2] * dot * (1 - c),
  ];
}

// Project screen coordinates to a unit sphere (arcball)
function projectToArcball(px, py, width, height) {
  const cx = width * 0.5;
  const cy = height * 0.5;

  const nx = (px - cx) / Math.min(cx, cy);
  const ny = (py - cy) / Math.min(cx, cy); // invert Y
  const d2 = nx * nx + ny * ny;

  if (d2 <= 1.0) {
    return [nx, ny, Math.sqrt(1 - d2)];
  }

  const len = Math.sqrt(d2);
  return [nx / len, ny / len, 0.0];
}


function vtkInteractorStyleArcballCamera(publicAPI, model) {
  model.classHierarchy.push('vtkInteractorStyleArcballCamera');

  // Tunables
  model.rotationScale = 1.0;    // multiply rotation angle if you want it faster
  model.invert = -1;            // flip rotation to match “drag object” feel

  publicAPI.handleMouseRotate = (renderer, position) => {
    if (!model.previousPosition) return;

    const rwi = model._interactor;
    const size = rwi.getView().getViewportSize(renderer);
    const w = size[0] || 0;
    const h = size[1] || 0;
    if (!w || !h) return;

    const p0 = projectToArcball(model.previousPosition.x, model.previousPosition.y, w, h);
    const p1 = projectToArcball(position.x, position.y, w, h);

    // Rotation axis in camera space
    let axisCam = [
      p0[1] * p1[2] - p0[2] * p1[1],
      p0[2] * p1[0] - p0[0] * p1[2],
      p0[0] * p1[1] - p0[1] * p1[0],
    ];
    let axisLen = vtkMath.norm(axisCam);
    if (axisLen < 1e-8) {
      model.previousPosition = position;
      return;
    }
    axisCam = axisCam.map(v => v / axisLen);

    // Rotation angle
    let angle = Math.acos(clamp(vtkMath.dot(p0, p1), -1, 1)) * model.rotationScale * model.invert;
    if (Math.abs(angle) < 1e-8) {
      model.previousPosition = position;
      return;
    }

    const camera = renderer.getActiveCamera();
    const fp = camera.getFocalPoint();
    const pos = camera.getPosition();

    // Camera basis in world space
    let dop = [fp[0] - pos[0], fp[1] - pos[1], fp[2] - pos[2]];
    vtkMath.normalize(dop);

    const rawUp = camera.getViewUp();
    let right = [0, 0, 0];
    vtkMath.cross(dop, rawUp, right);
    if (vtkMath.norm(right) < 1e-8) {
      right = Math.abs(dop[2]) < 0.99 ? [0, 0, 1] : [0, 1, 0];
      vtkMath.cross(dop, right, right);
    }
    vtkMath.normalize(right);

    const trueUp = [0, 0, 0];
    vtkMath.cross(right, dop, trueUp);
    vtkMath.normalize(trueUp);

    // Map axisCam (camera space) to world space
    const axisWorld = [
      right[0] * axisCam[0] + trueUp[0] * axisCam[1] + dop[0] * axisCam[2],
      right[1] * axisCam[0] + trueUp[1] * axisCam[1] + dop[1] * axisCam[2],
      right[2] * axisCam[0] + trueUp[2] * axisCam[1] + dop[2] * axisCam[2],
    ];

    // Rotate camera position around focal point
    const camVec = [pos[0] - fp[0], pos[1] - fp[1], pos[2] - fp[2]];
    const newCamVec = rotateAroundAxis(camVec, axisWorld, angle);
    camera.setPosition(fp[0] + newCamVec[0], fp[1] + newCamVec[1], fp[2] + newCamVec[2]);

    // Rotate viewUp similarly
    const newUp = rotateAroundAxis(rawUp, axisWorld, -angle);
    camera.setViewUp(...newUp);

    camera.orthogonalizeViewUp();

    if (model.autoAdjustCameraClippingRange) {
      renderer.resetCameraClippingRange();
    }
    if (rwi.getLightFollowCamera()) {
      renderer.updateLightsGeometryToFollowCamera();
    }

    model.previousPosition = position;
    publicAPI.invokeInteractionEvent({ type: 'InteractionEvent' });
  };
}


export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, initialValues);

  vtkInteractorStyleTrackballCamera.extend(publicAPI, model, initialValues);

  vtkInteractorStyleArcballCamera(publicAPI, model);
}

export const newInstance = macro.newInstance(
  extend,
  'vtkInteractorStyleArcballCamera'
);

export default { newInstance, extend };
