/**
 * Created by jljsj on 16/1/13.
 */
/* jshint esversion: 6 */
import React, {createElement} from 'react';
import PropTypes from 'prop-types';
import easingTypes from 'tween-functions';
import requestAnimationFrame from 'raf';
import EventListener from './EventDispatcher';
import {noop, transformArguments, currentScrollTop, windowHeight} from './util';

let scrollLinkLists = [];

class ScrollLink extends React.Component {
    static propTypes = {
        component: PropTypes.any,
        children: PropTypes.any,
        className: PropTypes.string,
        style: PropTypes.any,
        offsetTop: PropTypes.number,
        duration: PropTypes.number,
        active: PropTypes.string,
        to: PropTypes.string,
        targetId: PropTypes.string,
        showHeightActive: PropTypes.any,
        toShowHeight: PropTypes.bool,
        ease: PropTypes.string,
        onClick: PropTypes.func,
        onFocus: PropTypes.func,
        onBlur: PropTypes.func,
        toHash: PropTypes.bool,
        componentProps: PropTypes.object,
    }
    static defaultProps = {
        component: 'div',
        offsetTop: 0,
        duration: 450,
        active: 'active',
        showHeightActive: '50%',
        ease: 'easeInOutQuad',
        toHash: false,
        onClick: noop,
        onFocus: noop,
        onBlur: noop,
        componentProps: {},
    }

    constructor(props) {
        super(props);
        this.rafID = -1;
        this.state = {
            active: false,
        };
        this.domRef = React.createRef();
    }

    componentDidMount() {
        this.dom = this.domRef.current;
        this.target = this.props.targetId && document.getElementById(this.props.targetId);
        scrollLinkLists.push(this);
        const date = Date.now();
        const length = EventListener._listeners.scroll ? EventListener._listeners.scroll.length : 0;
        this.eventType = `scroll.scrollAnchorEvent${date}${length}`;
        EventListener.addEventListener(this.eventType, this.scrollEventListener, this.target);
        // 第一次进入；等全部渲染完成后执行;
        setTimeout(() => {
            this.scrollEventListener();
        });
    }

    componentWillUnmount() {
        scrollLinkLists = scrollLinkLists.filter(item => item !== this);
        EventListener.removeEventListener(this.eventType, this.scrollEventListener, this.target);
        this.cancelRequestAnimationFrame();
    }

    onClick = (e) => {
        e.preventDefault();
        EventListener.removeAllType('scroll.scrollAnchorEvent');
        this.elementDom = document.getElementById(this.props.to);
        ;
        if (this.rafID !== -1 || !this.elementDom) {
            return;
        }
        this.scrollTop = this.target ? this.target.scrollTop : currentScrollTop();
        this.initTime = Date.now();
        this.rafID = requestAnimationFrame(this.raf);
        scrollLinkLists.forEach(item => {
            if (item !== this) {
                item.remActive();
            }
        });
        this.addActive();
    }

    getToTop = () => {
        const elementRect = this.elementDom && this.elementDom.getBoundingClientRect();
        this.clientHeight = this.target ? this.target.clientHeight : windowHeight();
        const targetTop = this.target ? this.target.getBoundingClientRect().top : 0;
        const toTop = Math.round(elementRect.top + currentScrollTop()) - this.props.offsetTop - targetTop;
        const t = transformArguments(this.props.showHeightActive)[0];
        const toShow = t.match('%') ? this.clientHeight * parseFloat(t) / 100 : t;
        return this.props.toShowHeight ?
            toTop - toShow + 0.5 : toTop;
    }

    cancelRequestAnimationFrame = () => {
        requestAnimationFrame.cancel(this.rafID);
        this.rafID = -1;
    }

    addActive = () => {
        if (!this.state.active) {
            const obj = {
                target: this.dom,
                to: this.props.to,
            };
            this.props.onFocus(obj);
            this.setState({
                active: true,
            }, () => {
                if (this.props.toHash) {
                    const link = `#${this.props.to}`;
                    history.pushState(null, window.title, link);// eslint-disable-line
                }
            });
        }
    };


    raf = () => {
        if (this.rafID === -1) {
            return;
        }
        const duration = this.props.duration;
        const now = Date.now();
        const progressTime = now - this.initTime > duration ? duration : now - this.initTime;
        // 动画时也会改变高度，动态获取
        const easeValue = easingTypes[this.props.ease](progressTime, this.scrollTop,
            this.getToTop(), duration);
        if (this.target) {
            this.target.scrollTop = easeValue;
        } else {
            window.scrollTo(window.scrollX, easeValue);
        }
        if (progressTime === duration) {
            this.elementDom = null;
            this.cancelRequestAnimationFrame();
            EventListener.reAllType('scroll.scrollAnchorEvent');
        } else {
            this.rafID = requestAnimationFrame(this.raf);
        }
    }

    remActive = () => {
        if (this.state.active) {
            const obj = {
                target: this.dom,
                to: this.props.to,
            };
            this.props.onBlur(obj);
            this.setState({
                active: false,
            });
        }
    }

    scrollEventListener = () => {
        const elementDom = document.getElementById(this.props.to);
        if (!elementDom) {
            return;
        }
        // 滚动时会改变高度, 动态获取高度
        const clientHeight = this.target ? this.target.clientHeight : windowHeight();
        const elementRect = elementDom.getBoundingClientRect();
        const elementClientHeight = elementDom.clientHeight;
        const targetTop = this.target ? this.target.getBoundingClientRect().top : 0;
        const top = Math.round(-elementRect.top + targetTop);
        const showHeightActive = transformArguments(this.props.showHeightActive);
        const startShowHeight = showHeightActive[0].toString().indexOf('%') >= 0 ?
            parseFloat(showHeightActive[0]) / 100 * clientHeight :
            parseFloat(showHeightActive[0]);
        const endShowHeight = showHeightActive[1].toString().indexOf('%') >= 0 ?
            parseFloat(showHeightActive[1]) / 100 * clientHeight :
            parseFloat(showHeightActive[1]);
        if (top >= Math.round(-startShowHeight)
            && top < Math.round(elementClientHeight - endShowHeight)) {
            this.addActive();
        } else {
            this.remActive();
        }
    }

    render() {
        const {
            component,
            onClick,
            duration,
            active: tagActive,
            showHeightActive,
            ease,
            toShowHeight,
            offsetTop,
            targetId,
            to,
            toHash,
            componentProps,
            ...props
        } = this.props;
        const active = this.state.active ? tagActive : '';
        props.onClick = (e) => {
            onClick(e);
            this.onClick(e);
        }
        const reg = new RegExp(active, 'ig');
        const className = props.className || '';
        props.className = className.indexOf(active) === -1 ?
            `${className} ${active}`.trim() : className.replace(reg, '').trim();
        return createElement(this.props.component, {...props, ...componentProps, ref: this.domRef});
    }
}

ScrollLink.isScrollLink = true;

export default ScrollLink;