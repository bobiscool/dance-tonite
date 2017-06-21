const choose = require('./cms/choose').default;
const inbox = require('./cms/inbox').default;
const submissions = require('./cms/submissions').default;
const playback = require('./playback').default;

if (process.env.NODE_ENV === 'development') {
  require('preact/devtools');
}

export default {
  routes: {
    '/inbox/:recordingId?': inbox,
    '/choose/:roomId': choose,
    '/submissions/': submissions,
    '/:roomId?/:id?': playback,
  },
  components: { playback, choose, inbox },
};
