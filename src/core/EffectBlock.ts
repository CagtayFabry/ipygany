import * as Nodes from 'three/examples/jsm/nodes/Nodes';

import {
  uuid
} from './utils';

import {
  NodeMesh
} from './NodeMesh';

import {
  Block
} from './Block';

import {
  Data, Component
} from './Data';

import {
  NodeOperation
} from './NodeMesh';

/**
 * Effect InputDimension type, only float, vec2, vec3 and vec4 are supported in shaders.
 */
export
type InputDimension = 0 | 1 | 2 | 3 | 4;


/**
 * Effect class
 * This is the base class for all the effects: IsoColor, ClipPlane...
 */
export
class Effect extends Block {

  constructor (parent: Block, inputComponents?: ([string, string] | number)[]) {
    super(parent.vertices, parent.data);

    this.parent = parent;

    this.triangleIndices = parent.triangleIndices;
    this.tetrahedronIndices = parent.tetrahedronIndices;

    // Copy parent meshes, this does not copy geometries (data buffers are not copied)
    this.meshes = parent.meshes.map((nodeMesh: NodeMesh) => nodeMesh.copy() );

    this.setInput(inputComponents);
  }

  /**
    * Set the input data, if no arguments are provided a default input will be chosen.
    */
 setInput (components?: ([string, string] | number)[]) : void {
    if (this.inputDimension == 0) {
      // Do nothing (Maybe throw?)
      return;
    }

    let inputs: (Component | number)[];

    // Choose a default input if none is provided
    if (components === undefined) {
      if (this.data.length == 0) {
        throw 'No data provided, put this effect needs at least ${this.inputDimension} component(s) as input';
      }

      const inputData = this.data[0];

      if (this.inputDimension > inputData.dimension) {
        inputs = inputData.components.concat(new Array(this.inputDimension - inputData.dimension).fill(0.));
      } else {
        inputs = inputData.components.slice(0, this.inputDimension);
      }
    } else {
      if (components.length != this.inputDimension) {
        throw 'This effect needs ${this.inputDimension} component(s) as input, but ${components} was given';
      }

      inputs = components.map(this.getInput.bind(this));
    }

    // Set the input node
    this.inputs = inputs;

    if (inputs.length == 1) {
      this.inputNode = this.getInputNode(inputs[0]);
    } else {
      // @ts-ignore: The error raise by TypeScript is not relevant here, as the length of inputs is already validated
      this.inputNode = new Nodes.JoinNode(...inputs.map(this.getInputNode.bind(this)));
    }

    // Send component buffers to the GPU, if that's not done already.
    for (const input of this.inputs) {
      if (input instanceof Component) {
        this.addComponent(input);
      }
    }
  }

  /**
   * Add color node to materials
   */
  addColorNode (operation: NodeOperation, colorNode: Nodes.Node) {
    for (const nodeMesh of this.meshes) {
      nodeMesh.addColorNode(operation, colorNode);
    }

    this.buildMaterials();
  }

  get inputDimension () : InputDimension {
    return 0;
  }

  /**
   * Get a Data by name
   */
  private getData (name: string) : Data {
    for (const data of this.data) {
       if (data.name == name) {
         return data;
       }
     }

     throw `${name} if not a valid Data name`;
  }

  private getInput (component: [string, string] | number) {
    return typeof component == 'number' ? component : this.getData(component[0]).getComponent(component[1]);
  }

  private getInputNode (component: Component | number) : Nodes.Node {
    return component instanceof Component ? component.node : new Nodes.FloatNode(component);
  }

  parent: Block;

  protected inputs: (Component | number)[] | null = null;
  protected inputNode: Nodes.Node | null = null;

  protected id: string = uuid();

}