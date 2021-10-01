import React from 'react';
import PropTypes from 'prop-types';
import easingTypes from 'tween-functions';
import { Tween as Timeline } from 'rc-tween-one';
import ticker from 'rc-tween-one/lib/ticker';

import EventListener from './EventDispatcher';
import { noop, dataToArray, objectEqual, currentScrollTop, windowHeight } from './util';

let tickerId = 0;

function playScaleToArray(playScale) {
  if (Array.isArray(playScale)) {
    if (playScale.length === 2) {
      return playScale;
    }
    return [(playScale[0] || 0), (playScale[1] || 1)];
  } else if (playScale) {
    return [playScale, 1];
  }
  return [0, 1];
}

class ScrollParallax extends React.Component {
  static propTypes = {
    component: PropTypes.any,
    animation: PropTypes.any,
    always: PropTypes.bool,
    location: PropTypes.string,
    children: PropTypes.any,
    className: PropTypes.string,
    style: PropTypes.any,
    id: PropTypes.string,
    targetId: PropTypes.string,
    componentProps: PropTypes.object,
  }
  static defaultProps = {
    component: 'div',
    always: true,
    componentProps: {},
  }

  static getDerivedStateFromProps(props, { prevProps, $self }) {
    const nextState = {
      prevProps: props,
    };
    if (prevProps && props !== prevProps) {
      const equal = objectEqual(prevProps.animation, props.animation);
      if (!equal) {
        $self.setDefaultData(props.animation || {});
        $self.timeline.resetAnimData();
        $self.timeline.setDefaultData($self.defaultTweenData);
      }
    }
    return nextState; // eslint-disable-line
  }

  constructor(props) {
    super(props);
    this.scrollTop = 0;
    this.defaultTweenData = [];
    this.defaultData = [];
    this.state = {
      $self: this,
    };
    this.domRef = React.createRef();
  }

  componentDidMount() {
    this.dom = this.domRef.current;
    const date = Date.now();
    const length = EventListener._listeners.scroll ? EventListener._listeners.scroll.length : 0;
    this.eventType = `scroll.scrollEvent${date}${length}`;
    this.eventResize = `resize.resizeEvent${date}${length}`;
    this.resizeEventListener();
    EventListener.addEventListener(this.eventResize, this.resizeEventListener, this.target);
    // 预注册;
    this.timeline.frame(0);

    this.scrollEventListener();
    EventListener.addEventListener(this.eventType, this.scrollEventListener, this.target);
  }

  componentWillUnmount() {
    EventListener.removeEventListener(this.eventType, this.scrollEventListener, this.target);
    EventListener.removeEventListener(this.eventResize, this.resizeEventListener, this.target);
  }

  setDefaultData = _vars => {
    const vars = dataToArray(_vars);
    const varsForIn = (item, i) => {
      const playScale = playScaleToArray(item.playScale).map(data => data * this.clientHeight);
      const aItem = { ...item };
      delete aItem.playScale;
      const cItem = { ...item };
      delete cItem.playScale;
      cItem.delay = playScale[0];
      aItem.delay = playScale[0];
      cItem.duration = playScale[1] - playScale[0];
      aItem.duration = playScale[1] - playScale[0];
      cItem.onStart = null;
      cItem.onUpdate = null;
      cItem.onComplete = null;
      cItem.onRepeat = null;
      aItem.onStart = aItem.onStart || noop;
      aItem.onComplete = aItem.onComplete || noop;
      aItem.onUpdate = aItem.onUpdate || noop;
      aItem.onStartBack = aItem.onStartBack || noop;
      aItem.onCompleteBack = aItem.onCompleteBack || noop;
      this.defaultTweenData[i] = cItem;
      this.defaultData[i] = aItem;
    };
    vars.forEach(varsForIn);
  }

  resizeEventListener = () => {
    if (this.defaultData[this.defaultData.length - 1] && this.defaultData[this.defaultData.length - 1].onCompleteBool && !this.props.always) {
      return;
    }
    this.scrollTop = currentScrollTop();
    this.target = this.props.targetId && document.getElementById(this.props.targetId);
    this.clientHeight = this.target ? this.target.clientHeight : windowHeight();
    this.setDefaultData(this.props.animation || {});
    if (this.timeline) {
      this.timeline.resetDefaultStyle();
    }
    this.timeline = new Timeline(this.dom, this.defaultTweenData);
    this.timeline.init();
    this.scrollEventListener();
  }

  scrollEventListener = () => {
    const scrollTop = this.target ? this.target.scrollTop : currentScrollTop();
    this.clientHeight = this.target ? this.target.clientHeight : windowHeight();
    const dom = this.props.location ? document.getElementById(this.props.location) : this.dom;
    if (!dom) {
      throw new Error('"location" is null');
    }
    const targetTop = this.target ? this.target.getBoundingClientRect().top : 0;
    const offsetTop = dom.getBoundingClientRect().top + scrollTop - targetTop;
    const elementShowHeight = scrollTop - offsetTop + this.clientHeight;
    const currentShow = this.scrollTop - offsetTop + this.clientHeight;
    this.defaultData.forEach((item, i) => {
      const duration = this.defaultData.map((c, ii) => ii < i && c.delay + c.duration || 0).reduce((a,b) => a + b);
      let noUpdate;
      if (elementShowHeight <= item.delay + duration) {
        if (!item.onCompleteBackBool && item.onStartBool) {
          item.onCompleteBackBool = true;
          noUpdate = true;
          item.onCompleteBack();
        }
      } else {
        item.onCompleteBackBool = false;
      }
      if (elementShowHeight >= item.delay + duration) {
        if (!item.onStartBool) {
          item.onStartBool = true;
          noUpdate = true;
          item.onStart();
        }
      } else {
        item.onStartBool = false;
      }

      if (elementShowHeight <= item.delay + item.duration + duration) {
        if (!item.onStartBackBool && item.onCompleteBool) {
          item.onStartBackBool = true;
          noUpdate = true;
          item.onStartBack();
        }
      } else {
        item.onStartBackBool = false;
      }

      if (elementShowHeight >= item.delay + item.duration + duration) {
        if (!item.onCompleteBool) {
          item.onCompleteBool = true;
          noUpdate = true;
          item.onComplete();
        }
      } else {
        item.onCompleteBool = false;
      }
      if (elementShowHeight >= item.delay + duration &&
          elementShowHeight <= item.delay + item.duration + duration &&
          !noUpdate
      ) {
        item.onUpdate(elementShowHeight / (item.delay + item.duration + duration));
      }
    });
    ticker.clear(this.tickerId);
    this.tickerId = `scrollParallax${Date.now()}-${tickerId}`;
    tickerId++;
    if (tickerId >= Number.MAX_VALUE) {
      tickerId = 0;
    }
    const startFrame = ticker.frame;
    ticker.wake(this.tickerId, () => {
      const moment = (ticker.frame - startFrame) * ticker.perFrame;
      const ratio = easingTypes.easeOutQuad(moment, 0.08, 1, 300);
      this.timeline.frame(currentShow + ratio * (elementShowHeight - currentShow));
      if (moment >= 300) {
        ticker.clear(this.tickerId);
      }
    });

    this.scrollTop = scrollTop;
    // 如果不一直靠滚动来执行动画，always=false而且动画全执行完了，，删除scrollEvent;
    if (this.defaultData[this.defaultData.length - 1].onCompleteBool && this.eventType && !this.props.always) {
      EventListener.removeEventListener(this.eventType, this.scrollEventListener, this.target);
    }
  }

  render() {
    const {
      animation,
      always,
      component,
      location,
      targetId,
      componentProps,
      ...props
    } = this.props;
    const style = { ...props.style };
    Object.keys(style).forEach(p => {
      if (p.indexOf('filter') >= 0 || p.indexOf('Filter') >= 0) {
        // ['Webkit', 'Moz', 'Ms', 'ms'].forEach(prefix=> style[`${prefix}Filter`] = style[p]);
        const transformArr = ['Webkit', 'Moz', 'Ms', 'ms'];
        for (let i = 0; i < transformArr.length; i++) {
          style[`${transformArr[i]}Filter`] = style[p];
        }
      }
    });
    props.style = style;
    return React.createElement(this.props.component, { ...props, ...componentProps, ref: this.domRef });
  }
}

ScrollParallax.isScrollParallax = true;
export default ScrollParallax;