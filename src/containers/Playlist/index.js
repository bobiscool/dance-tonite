/** @jsx h */
import { h, Component } from 'preact';
import asyncEach from 'async/eachLimit';

import './style.scss';

import Room from '../../room';
import audio from '../../audio';
import viewer from '../../viewer';
import storage from '../../storage';
import layout from '../../room/layout';
import Orb from '../../orb';
import settings from '../../settings';
import transition from '../../transition';
import router from '../../router';

import BackgroundTimeline from '../../components/BackgroundTimeline';
import RoomLabels from '../../components/RoomLabels';
import POV from '../../components/POV';

const easeOut = t => -t * (t - 2.0);

export default class Playlist extends Component {
  constructor() {
    super();
    this.rooms = [];
    this.orb = new Orb();
    this.tick = this.tick.bind(this);
  }

  componentWillMount() {
    this.mounted = true;

    const { recording } = this.props;
    const { rooms } = this;

    if (recording) {
      for (let index = 1; index < 20; index += 2) {
        const room = new Room({ recording, index, wall: true });
        rooms.push(room);
      }
    }

    this.moveOrb(0);
    Room.reset();
    Room.rotate180();

    this.asyncMount();
    viewer.events.on('tick', this.tick);
  }

  componentWillReceiveProps({ orb }) {
    if (orb) {
      this.orb.show();
    } else {
      this.orb.hide();
    }
  }

  componentWillUnmount() {
    this.orb.destroy();
    this.rooms.forEach((room) => room.destroy());
    viewer.events.off('tick', this.tick);
  }

  async asyncMount() {
    const { pathRecording, pathRoomIndex } = this.props;
    const entries = this.entries = await storage.loadPlaylist();
    if (!this.mounted) return;

    for (let i = 0; i < entries.length; i++) {
      const isPathRecording = i === pathRoomIndex - 1;
      const entry = entries[i];
      this.rooms.push(
        new Room({
          id: isPathRecording
            ? `${pathRecording}`
            : process.env.FLAVOR === 'cms'
              ? entry.id
              : entry,
          index: i,
          pathRecording: isPathRecording,
        })
      );
    }

    await new Promise((resolve) => {
      const destroyedErrorName = 'playlist destroyed';
      asyncEach(
        this.rooms,
        4,
        (room, callback) => {
          // If destroyed, callback with error to stop loading further files:
          if (this.destroyed) {
            return callback(Error(destroyedErrorName));
          }
          room.load(callback);
        },
        (error) => {
          if (error && error.name !== destroyedErrorName) {
            this.onError(error);
          }
          resolve();
        },
      );
    });
  }

  moveOrb(progress) {
    const position = layout.getPosition(progress + 0.5);
    position.y += settings.holeHeight;
    position.z *= -1;
    this.orb.position.copy(position);
  }

  tick() {
    if (!this.rooms || transition.isInside()) return;
    this.moveOrb(audio.progress || 0);

    if (!audio.loopDuration) return;
    for (let i = 0; i < this.rooms.length; i++) {
      const room = this.rooms[i];
      let time = audio.time;
      if (layout.isOdd(room.index)) {
        time += audio.loopDuration;
      }
      // Slow down recordings to a stop after music stops:
      const slowdownDuration = 0.4;
      const maxTime = 216.824266 - (slowdownDuration * 0.5);
      if (audio.time > maxTime) {
        time = maxTime + easeOut(
          Math.min(
            slowdownDuration,
            audio.time - maxTime
          ) / slowdownDuration
        ) * slowdownDuration;
      }
      room.gotoTime(time % (audio.loopDuration * 2));
    }
  }

  navigateToChooser(room) {
    router.navigate(`/choose/${room.index}/`);
  }

  render() {
    return (
      <div>
        <POV
          rooms={this.rooms}
          orb={this.orb}
          enterHeads={process.env.FLAVOR !== 'cms'}
        />
        {
          process.env.FLAVOR === 'cms' &&
          !viewer.vrEffect.isPresenting &&
          <RoomLabels
            rooms={this.rooms}
            entries={this.entries}
          />
        }
        <BackgroundTimeline />
      </div>
    );
  }
}