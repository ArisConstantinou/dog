# Leo 3D model source

- Runtime asset: `public/models/leo.glb`.
- Source: the owner-selected Meshy Leo model generated from Leo's references.
- Web optimization: 159,006 triangles, 98,633 vertices, 2048px base-color, metallic/roughness, and normal textures; asymmetric markings remain in `COLOR_0` vertex data.
- Motion: local shader-based topology deformation for head, torso, tail, front/rear legs, raised paw, rear-body crouch, and spine twist.

No other GLB is shipped or loaded. The previous generic Jack Russell and low-poly models are removed from the website. This Meshy source has no armature, skin weights, or embedded animation clips, so the current motion is an honest topology-deformation stage rather than a full skeletal quadruped rig.
