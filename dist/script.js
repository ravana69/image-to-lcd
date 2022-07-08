window.addEventListener("DOMContentLoaded",app);

function app() {
	let form = document.forms[0],
		imgUpload = document.getElementsByName("img_upload")[0],
		imgName = document.getElementsByName("img_name")[0],
		resetCamBtn = document.getElementsByName("reset_camera")[0],
		canvas = document.createElement("canvas"),
		c = canvas.getContext("2d"),
		scene,
		renderer,
		camera,
		camControls,
		img = null,
		screenLCD,
		// be careful; attempting to increase these will result in lag
		tvWidth = 40,
		tvHeight = 30,

		adjustWindow = () => {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth,window.innerHeight);
		},
		buildScreen = () => {
			return new Promise((resolve,reject) => {
				let channelProtoGeo = new THREE.PlaneBufferGeometry(0.3,0.9),
				channelGeos = [],
				channelMats = [],
				redChannelProtoMat = new THREE.MeshBasicMaterial({
					color: 0xff0000
				}),
				greenChannelProtoMat = new THREE.MeshBasicMaterial({
					color: 0x00ff00
				}),
				blueChannelProtoMat = new THREE.MeshBasicMaterial({
					color: 0x0000ff
				});

				for (let h = 0; h < tvHeight; ++h) {
					for (let w = 0; w < tvWidth; ++w) {
						let channelY = (-tvHeight / 2 + h) * -1,
							redChannelGeo = channelProtoGeo.clone(),
							redChannelMat = redChannelProtoMat.clone(),
							greenChannelGeo = channelProtoGeo.clone(),
							greenChannelMat = greenChannelProtoMat.clone(),
							blueChannelGeo = channelProtoGeo.clone(),
							blueChannelMat = blueChannelProtoMat.clone();

						redChannelGeo.translate(-tvWidth / 2 - 0.33 + w,channelY,0);
						greenChannelGeo.translate(-tvWidth / 2 + w,channelY,0);
						blueChannelGeo.translate(-tvWidth / 2 + 0.33 + w,channelY,0);
						channelGeos.push(redChannelGeo,greenChannelGeo,blueChannelGeo);
						channelMats.push(redChannelMat,greenChannelMat,blueChannelMat);
					}
				}
				let channelGeo = THREE.BufferGeometryUtils.mergeBufferGeometries(channelGeos,true);
				screenLCD = new THREE.Mesh(channelGeo,channelMats);
				screenLCD.name = "LCD Screen";
				scene.add(screenLCD);

				// initialize canvas and screen
				canvas.width = tvWidth;
				canvas.height = tvHeight;
				c.fillStyle = "#fff";
				c.fillRect(0,0,tvWidth,tvHeight);

				resolve();

			}).then(() => {
				// deal with preserved input or go ahead with the white screen
				if (imgUpload.value != "")
					renderPromise();
				else
					updateScreen();
			});
		},
		handleImgUpload = e => {
			return new Promise((resolve,reject) => {
				let target = !e ? imgUpload : e.target;
				if (target.files.length) {
					let reader = new FileReader();
					reader.onload = e2 => {
						img = new Image();
						img.src = e2.target.result;
						img.onload = () => {
							resolve();
						};
						img.onerror = () => {
							img = null;
							reject("The image has been nullified due to file corruption or a wrong file kind.");
						};
						imgName.placeholder = target.files[0].name;
					};
					reader.readAsDataURL(target.files[0]);
				}
			});
		},
		imgUploadValid = () => {
			let files = imgUpload.files,
				fileIsThere = files.length > 0,
				isImage = files[0].type.match("image.*"),
				valid = fileIsThere && isImage;

			return valid;
		},
		init = () => {
			// setup
			scene = new THREE.Scene();
			renderer = new THREE.WebGLRenderer({
				antialias: true
			});
			renderer.setClearColor(new THREE.Color(0x000000));
			renderer.setPixelRatio(window.devicePixelRatio);
			renderer.setSize(window.innerWidth, window.innerHeight);

			// camera
			camera = new THREE.PerspectiveCamera(60,window.innerWidth / window.innerHeight,0.1,1000);
			camera.position.set(0,0,70);
			camera.lookAt(scene.position);
			camControls = new THREE.OrbitControls(camera,renderer.domElement);
			camControls.minDistance = 4;
			camControls.maxDistance = 128;
			camControls.minPolarAngle = -Math.PI / 2;
			camControls.maxPolarAngle = Math.PI;
			camControls.minAzimuthAngle = -Math.PI / 2;
			camControls.maxAzimuthAngle = Math.PI / 2;

			// render
			let body = document.body;
			body.insertBefore(renderer.domElement,body.childNodes[4]);
			renderScene();
			
			// LCD screen
			buildScreen();
		},
		renderPromise = e => {
			handleImgUpload(e).then(() => {
				if (imgUploadValid()) {
					updateCanvas();
					updateScreen();
				}
			}).catch(msg => {
				console.log(msg);
			});
		},
		renderScene = () => {
			renderer.render(scene,camera);
			requestAnimationFrame(renderScene);
		},
		updateCanvas = () => {
			// restrict image size, keep it proportional
			let imgWidth = img.width,
				imgHeight = img.height;

			if (imgWidth > imgHeight && imgWidth >= tvWidth) {
				// overflow left and right
				imgWidth = tvWidth;
				imgHeight = imgWidth * (img.height / img.width);

			} else if (imgWidth <= imgHeight && imgHeight >= tvHeight) {
				// overflow top and bottom
				imgHeight = tvHeight;
				imgWidth = imgHeight * (img.width / img.height);
			}
			// update canvas with image in center
			let imgX = tvWidth / 2 - imgWidth / 2,
				imgY = tvHeight / 2 - imgHeight / 2;

			c.clearRect(0,0,tvWidth,tvHeight);
			c.drawImage(img,imgX,imgY,imgWidth,imgHeight);
		},
		updateScreen = () => {
			let imgData = c.getImageData(0,0,tvWidth,tvHeight),
				data = imgData.data;

			for (let i = 0; i < data.length; i += 4) {
				let red = data[i],
					green = data[i + 1],
					blue = data[i + 2],
					alpha = data[i + 3] / 255,
					matIndex = i / 4 * 3,
					redMat = screenLCD.material[matIndex],
					greenMat = screenLCD.material[matIndex + 1],
					blueMat = screenLCD.material[matIndex + 2];
				// red
				redMat.color.set(`rgb(${red},0,0)`);
				redMat.opacity = alpha;
				redMat.needsUpdate = true;
				// green
				greenMat.color.set(`rgb(0,${green},0)`);
				greenMat.opacity = alpha;
				greenMat.needsUpdate = true;
				// blue
				blueMat.color.set(`rgb(0,0,${blue})`);
				blueMat.opacity = alpha;
				blueMat.needsUpdate = true;
			}
		};

	init();
	imgUpload.addEventListener("change",renderPromise);
	resetCamBtn.addEventListener("click",camControls.reset);
	window.addEventListener("resize",adjustWindow);
}