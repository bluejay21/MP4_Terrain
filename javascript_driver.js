/**
 * Given the source code of a vertex and fragment shader, compiles them,
 * and returns the linked program.
 */
function compileShader(vs_source, fs_source) {
    const vs = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vs, vs_source)
    gl.compileShader(vs)
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(vs))
        throw Error("Vertex shader compilation failed")
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fs, fs_source)
    gl.compileShader(fs)
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(fs))
        throw Error("Fragment shader compilation failed")
    }

    const program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program))
        throw Error("Linking failed")
    }
    
    const uniforms = {}
    for(let i=0; i<gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); i+=1) {
        let info = gl.getActiveUniform(program, i)
        uniforms[info.name] = gl.getUniformLocation(program, info.name)
    }
    program.uniforms = uniforms

    return program
}

/**
 * Sends per-vertex data to the GPU and connects it to a VS input
 * 
 * @param data    a 2D array of per-vertex data (e.g. [[x,y,z,w],[x,y,z,w],...])
 * @param loc     the layout location of the vertex shader's `in` attribute
 * @param mode    (optional) gl.STATIC_DRAW, gl.DYNAMIC_DRAW, etc
 * 
 * @returns the ID of the buffer in GPU memory; useful for changing data later
 */
function supplyDataBuffer(data, loc, mode) {
    if (mode === undefined) mode = gl.STATIC_DRAW
    
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    const f32 = new Float32Array(data.flat())
    gl.bufferData(gl.ARRAY_BUFFER, f32, mode)
    
    gl.vertexAttribPointer(loc, data[0].length, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(loc)
    
    return buf;
}

/**
 * Creates a Vertex Array Object and puts into it all of the data in the given
 * JSON structure, which should have the following form:
 * 
 * ````
 * {"triangles": a list of of indices of vertices
 * ,"attributes":
 *  [ a list of 1-, 2-, 3-, or 4-vectors, one per vertex to go in location 0
 *  , a list of 1-, 2-, 3-, or 4-vectors, one per vertex to go in location 1
 *  , ...
 *  ]
 * }
 * ````
 * 
 * @returns an object with four keys:
 *  - mode = the 1st argument for gl.drawElements
 *  - count = the 2nd argument for gl.drawElements
 *  - type = the 3rd argument for gl.drawElements
 *  - vao = the vertex array object for use with gl.bindVertexArray
 */
function setupGeomery(geom) {
    var triangleArray = gl.createVertexArray()
    gl.bindVertexArray(triangleArray)

    for(let i=0; i<geom.attributes.length; i+=1) {
        let data = geom.attributes[i]
        supplyDataBuffer(data, i)
    }

    var indices = new Uint16Array(geom.triangles.flat())
    var indexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)

    return {
        mode: gl.TRIANGLES,
        count: indices.length,
        type: gl.UNSIGNED_SHORT,
        vao: triangleArray
    }
}

function fillScreen() {
    let canvas = document.querySelector('canvas')
    document.body.style.margin = '0'
    canvas.style.width = '100vw'
    canvas.style.height = '100vh'
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    canvas.style.width = ''
    canvas.style.height = ''
    if (window.gl) {
        gl.viewport(0,0, canvas.width, canvas.height)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
        window.p = m4perspNegZ(0.1, 10, 1.5, canvas.width, canvas.height)
    }
}

function makeGeom()
{
    var gridSize = document.getElementById("gridsize").value
    var faults = document.getElementById("faults").value
    let positionIndex = 0
    let colorIndex = 1

    // console.log("Button Pressed")
    // console.log("gridsize: " + String(gridSize))
    // console.log("faults: " + String(faults))

    var faultPlane = 
    {"triangles":
        [
        ]
    ,"attributes":
        [   // Positiions
            []
            , // Colors
            []
        ]
    }

    // Make the vertices
    stepSize = 2/(gridSize-1) 
    for (let i=-1; i<=1; i+=stepSize) {
        for (let j=-1; j<=1; j+=stepSize) {
            faultPlane.attributes[positionIndex].push([i, 0, j])
            faultPlane.attributes[colorIndex].push([Math.random(), Math.random(), Math.random()])
        }
    }

    // Make the triangles
    var n = gridSize*1
    for (let i = 0; (i+n+1) < faultPlane.attributes[positionIndex].length; i++) {
        faultPlane.triangles.push(i)
        faultPlane.triangles.push(i+1)
        faultPlane.triangles.push(i+n)

        faultPlane.triangles.push(i+1)
        faultPlane.triangles.push(i+n)
        faultPlane.triangles.push(i+n+1)
    }

    return faultPlane
}

function faultingMethod(gridPlane) {
    // Generate a random point p in the (x,0,z) bounds of the grid
    var random_x = (Math.random()*2)-1
    var random_z = (Math.random()*2)-1
    p = [random_x, 0, random_z]

    var random_theta = Math.random()*2*Math.PI
    var normal_vector = [Math.sin(random_theta), 0, Math.cos(random_theta)]

    for(b in gridPlane) {
        random_point_delta = pointSubtraction(b,p)
        if (dotProduct(random_point_delta, normal_vector, random_theta) > 0) {
            // raise point
        } else {
            // lower point
        }
    }
}

function pointSubtraction(a,b) {
    return [a[0]-b[0], 
            a[1]-b[1], 
            a[2]-b[2],]
}

function dotProduct(a,b,theta) {
    abs_a = Math.sqrt((a[0]^2) + (a[1]^2) + (a[2]^2))
    abs_b = Math.sqrt((b[0]^2) + (b[1]^2) + (b[2]^2))
    return abs_a*abs_b*Math.cos(theta)
}

function draw(seconds) {
    // gl.clearColor() // f(...[1,2,3]) means f(1,2,3)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.useProgram(program)
    gl.bindVertexArray(geom.vao)

    // gl.uniform4fv(program.uniforms.color, IlliniOrange)

    let m = m4rotX(0)
    let v = m4view([1,2,3], [0,0,0], [0,1,0])
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v,m))
    gl.uniformMatrix4fv(program.uniforms.p, false, p)
    gl.drawElements(geom.mode, geom.count, geom.type, 0)
}

/** Compute any time-varying or animated aspects of the scene */
function tick(milliseconds) {
    let seconds = milliseconds / 1000;

    draw(seconds)
    requestAnimationFrame(tick)
}

/** Compile, link, set up geometry */
window.addEventListener('load', async (event) => {
    window.gl = document.querySelector('canvas').getContext('webgl2',
        // optional configuration object: see https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
        {antialias: false, depth:true, preserveDrawingBuffer:true}
    )
    let vs = await fetch('vertex_shader.glsl').then(res => res.text())
    let fs = await fetch('fragment_shader.glsl').then(res => res.text())
    window.program = compileShader(vs,fs)
    gl.enable(gl.DEPTH_TEST)
    window.geom = setupGeomery(makeGeom())
    fillScreen()
    // window.addEventListener('resize', fillScreen)
    // window.keysBeingPressed = {}
    // window.addEventListener('keydown', event => keysBeingPressed[event.key] = true)
    // window.addEventListener('keyup', event => keysBeingPressed[event.key] = false)
    var regenerateButton = document.getElementById("submit")
    regenerateButton.addEventListener("click", async (event) => {
        window.geom = setupGeomery(makeGeom())
        event.preventDefault()
    });
    requestAnimationFrame(tick)
})