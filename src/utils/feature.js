const userAgent = navigator.userAgent;
import { queryData } from '../utils/url';

const verbosity = 0;
const log = (...args) => {
  console.log('Features:', ...args);
};

const checkHasWebGL = () => {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl')
    || canvas.getContext('experimental-webgl');
  return (gl && gl instanceof WebGLRenderingContext);
};

const hasWebVR = navigator.getVRDisplays !== undefined;

const getVRDisplays = () => (
  new Promise((resolve) => {
    if (!hasWebVR) {
      resolve(false);
      return;
    }

    const promises = [];
    promises.push(navigator.getVRDisplays());

    // On Android chrome, there is a bug where getVRDisplays is never resolved.
    // Set a 2 second timeout in that case
    // https://bugs.chromium.org/p/chromium/issues/detail?id=727969
    if (isAndroid) {
      const timeoutPromise = new Promise((timeOutResolve) => {
        setTimeout(() => {
          timeOutResolve([]);
        }, 2000);
      });
      promises.push(timeoutPromise);
    }

    Promise.race(promises)
      .then((displays) => {
        resolve(displays);
      })
      .catch((error) => {
        console.log(error);
        resolve(false);
      });
  })
);

const checkHasExternalDisplay = () => (
  new Promise((resolve) => {
    if (!hasWebVR) {
      resolve(false);
      return;
    }
    getVRDisplays()
      .then(
        (displays) => {
          resolve(
            !!displays[0] &&
            !!displays[0].capabilities &&
            !!displays[0].capabilities.hasExternalDisplay
          );
        }
      )
      .catch((error) => {
        console.log(error);
        resolve(false);
      });
  })
);

const checkHasVR = () => (
  new Promise((resolve) => {
    if (!hasWebVR && !vrPolyfill) {
      resolve(false);
      return;
    }
    getVRDisplays()
      .then((displays) => {
        if (displays.length === 0) resolve(false);
        else resolve(true);
      })
      .catch((error) => {
        console.log(error);
        resolve(false);
      });
  })
);

const checkHas6DOF = () => (
  new Promise((resolve) => {
    if (!hasWebVR) {
      resolve(false);
      return;
    }
    getVRDisplays()
      .then((displays) => {
        resolve(
          !!displays[0] &&
          !!displays[0].capabilities &&
          !!displays[0].capabilities.hasPosition
        );
      })
      .catch((error) => {
        console.log(error);
        resolve(false);
      });
  })
);


const isAndroid = /android/i.test(userAgent);
const isMobile = /android|ipad|iphone|iemobile/i.test(userAgent);
const isTablet = (isAndroid && !/mobile/i.test(userAgent)) // https://stackoverflow.com/questions/5341637/how-do-detect-android-tablets-in-general-useragent
  || /ipad/i.test(userAgent);
const vrPolyfill = isMobile && !isTablet && !isAndroid && (navigator.getVRDisplays === undefined);


const feature = {
  isMobile,
  isTablet,
  isAndroid,
  isChrome: /chrome/i.test(userAgent),
  stats: /fps/.test(window.location.hash),
  maxDevicePixelRatio: queryData.dpr || window.devicePixelRatio,
  vrPolyfill,
  hasWebGL: checkHasWebGL(),
  hasWebVR,
  prepare: () => (
    Promise.all([
      checkHasVR()
        .then((hasVR) => {
          feature.hasVR = hasVR;
          if (verbosity > 0) log('hasVR', feature.hasVR);
        }),
      getVRDisplays()
        .then((vrDisplays) => {
          if (verbosity > 0) log('getVRDisplays', vrDisplays);
          feature.vrDisplays = vrDisplays.length;
          if (vrDisplays && vrDisplays.length > 0) {
            //  Yes, this must be the full vrDisplay instance
            //  because we want to check isPresenting in analytics!
            feature.vrDisplay = vrDisplays[0];
            const displayName = vrDisplays[0].displayName;
            //  Expecting "Google, Inc. Daydream View".
            //  Unclear if stand-alone Daydream just announced at I/O 2017
            //  will eventually require its own displayName check.
            feature.isDaydream = /daydream/i.test(displayName);
            //  Expecting "HTC Vive DVT".
            feature.isVive = /vive/i.test(displayName);
            //  Expecting "Oculus VR HMD (HMD)" or "Oculus VR HMD (Sensor)".
            //  Note that "Rift" is NOT part of the displayName.
            feature.isOculus = /oculus/i.test(displayName);
            //  If it’s mobile but it’s not Daydream then we can consider
            //  it to be “Cardbaord” since we’re using the WebVR Polyfill
            //  to make any mobile device (with accelerometers) a potential
            //  3DOF virtual reality device.
            feature.isCardboard = feature.isMobile && !feature.isDaydream;
          }
        }),
      checkHasExternalDisplay()
        .then((hasExternalDisplay) => {
          if (verbosity > 0) log('hasExternalDisplay', hasExternalDisplay);
          feature.hasExternalDisplay = hasExternalDisplay;
        }),
      checkHas6DOF()
        .then((has6DOF) => {
          if (verbosity > 0) log('has6DOF', has6DOF);
          feature.has6DOF = has6DOF;
        }),
    ])
  ),
};

export default feature;
