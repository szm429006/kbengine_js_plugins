/**
 * KBEngine的html5客户端扩展ts版   2.x版本
 * cocos creator 环境下使用方法
 * 
 * 注：（下面的是重点）
 *      1、实体声明的命名空间为KBEngine.Entities,与官方的KBEngine不同
 *      2、cocos creator环境下,按下面方法声明实体
 *          @KBEngine.registerEntity('Account')
            export default class AccountEntity extends KBEngine.Entity {
                __init__() {
                    console.log('创建account')
                }
            }
            //这里加入声明用于vscode代码提示
            declare global {
                namespace KBEngine.Entities {
                    class Account extends AccountEntity { }
                }
            } 
 *      3、cocos creator编辑器下会出现KBEngine未找到的问题，不影响运行，如果想去掉，将允许编辑器加载勾选
 */

/*-----------------------------------------------------------------------------------------
                                            global
-----------------------------------------------------------------------------------------*/
namespace KBEngine {
    export const CLIENT_VERSION = '2.0.0';
    export const CLIENT_SCRIPT_VERSION = '0.1.0';

    export const PACKET_MAX_SIZE = 1500;
    export const PACKET_MAX_SIZE_TCP = 1460;
    export const PACKET_MAX_SIZE_UDP = 1472;

    export const MESSAGE_ID_LENGTH = 2;
    export const MESSAGE_LENGTH_LENGTH = 2;
    export const MESSAGE_LENGTH1_LENGTH = 4;
    export const MESSAGE_MAX_SIZE = 65535;

    export const CLIENT_NO_FLOAT = 0;
    export const KBE_FLT_MAX = 3.402823466e+38;
}
/**
 * 加上声明避免cocos creator编辑器报错
 */
window['KBEngine'] = KBEngine;


if (!ArrayBuffer['transfer']) {
    ArrayBuffer['transfer'] = function (source: ArrayBuffer, length: number): ArrayBuffer {
        let dest = new ArrayBuffer(length);

        if (!(source instanceof ArrayBuffer) || !(dest instanceof ArrayBuffer)) {
            throw new TypeError("ArrayBuffer.transfer, error: Source and destination must be ArrayBuffer instances");
        }

        if (dest.byteLength >= source.byteLength) {
            let buf = new Uint8Array(dest);
            buf.set(new Uint8Array(source), 0);
        }
        else {
            throw new RangeError("ArrayBuffer.transfer, error: destination has not enough space");
        }

        return dest;
    };
};
/*-----------------------------------------------------------------------------------------
                                                    number64bits
-----------------------------------------------------------------------------------------*/
namespace KBEngine {
    export class INT64 {
        constructor(lo, hi) {
            this.lo = lo;
            this.hi = hi;

            if (hi >= 2147483648) {
                this.sign = -1;
                if (this.lo > 0) {
                    this.lo = (4294967296 - this.lo) & 0xffffffff;
                    this.hi = 4294967295 - this.hi;
                }
                else {
                    this.lo = (4294967296 - this.lo) & 0xffffffff;
                    this.hi = 4294967296 - this.hi;
                }
            }
        }
        lo: number;
        hi: number;
        sign: number = 1;
        toString() {
            let result = "";

            if (this.sign < 0) {
                result += "-"
            }

            let low = this.lo.toString(16);
            let high = this.hi.toString(16);

            if (this.hi > 0) {
                result += high;
                for (let i = 8 - low.length; i > 0; --i) {
                    result += "0";
                }
            }
            result += low;

            return result;
        }
    }
    export class UINT64 {
        constructor(lo, hi) {
            this.lo = lo;
            this.hi = hi;
        }
        lo: number;
        hi: number;
        toString() {
            let low = this.lo.toString(16);
            let high = this.hi.toString(16);

            let result = "";
            if (this.hi > 0) {
                result += high;
                for (let i = 8 - low.length; i > 0; --i) {
                    result += "0";
                }
            }
            result += low;
            return result;
        }
    }
}
/*-----------------------------------------------------------------------------------------
                                            debug
-----------------------------------------------------------------------------------------*/
namespace KBEngine {
    /** todo 调试输出模块，这里需要根据使用的引擎不同在这里加入判断条件 */
    export function INFO_MSG(...args: any[]) {
        console.info.apply(console, args);
    }
    export function DEBUG_MSG(...args: any[]) {
        console.debug.apply(console, args);
    }
    export function ERROR_MSG(...args: any[]) {
        console.error.apply(console, args);
    }
    export function WARNING_MSG(...args: any[]) {
        console.warn.apply(console, args);
    }
}
/*-----------------------------------------------------------------------------------------
                                            string
-----------------------------------------------------------------------------------------*/
namespace KBEngine {
    export function utf8ArrayToString(array: Array<any>) {
        let out, i, len, c;
        let char2, char3;

        out = "";
        len = array.length;
        i = 0;

        while (i < len) {
            c = array[i++];

            switch (c >> 4) {
                case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
                    // 0xxxxxxx
                    out += String.fromCharCode(c);
                    break;
                case 12: case 13:
                    // 110x xxxx   10xx xxxx
                    char2 = array[i++];
                    out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
                    break;
                case 14:
                    // 1110 xxxx  10xx xxxx  10xx xxxx
                    char2 = array[i++];
                    char3 = array[i++];
                    out += String.fromCharCode(((c & 0x0F) << 12) |
                        ((char2 & 0x3F) << 6) |
                        ((char3 & 0x3F) << 0));
                    break;
            }
        }

        return out;
    }
    export function stringToUTF8Bytes(str: string) {
        let utf8 = [];
        for (let i = 0; i < str.length; i++) {
            let charcode = str.charCodeAt(i);
            if (charcode < 0x80) utf8.push(charcode);
            else if (charcode < 0x800) {
                utf8.push(0xc0 | (charcode >> 6),
                    0x80 | (charcode & 0x3f));
            }
            else if (charcode < 0xd800 || charcode >= 0xe000) {
                utf8.push(0xe0 | (charcode >> 12),
                    0x80 | ((charcode >> 6) & 0x3f),
                    0x80 | (charcode & 0x3f));
            }
            // surrogate pair
            else {
                i++;
                // UTF-16 encodes 0x10000-0x10FFFF by
                // subtracting 0x10000 and splitting the
                // 20 bits of 0x0-0xFFFFF into two halves
                charcode = 0x10000 + (((charcode & 0x3ff) << 10)
                    | (str.charCodeAt(i) & 0x3ff))
                utf8.push(0xf0 | (charcode >> 18),
                    0x80 | ((charcode >> 12) & 0x3f),
                    0x80 | ((charcode >> 6) & 0x3f),
                    0x80 | (charcode & 0x3f));
            }
        }
        return utf8;
    }
}

/*-----------------------------------------------------------------------------------------
                                            event
-----------------------------------------------------------------------------------------*/
namespace KBEngine {
    export class EventInfo {
        constructor(public classinst, public callbackfn) {
        }
    }
    export class FiredEvent {
        constructor(public evtName, public evtInfo, public ars) { }
    }
    export interface IEvents {
        [evtName: string]: EventInfo[];
    }
    export class Events {
        constructor() {

        }
        _events: IEvents = {};
        _isPause = false;
        _firedEvents: FiredEvent[] = []
        register(evtName: string, classinst, strCallback: string) {
            let callbackfn = classinst[strCallback];
            if (callbackfn == undefined) {
                ERROR_MSG('export class Event::fire: not found strCallback(' + classinst + ")!" + strCallback);
                return;
            }

            let evtlst = this._events[evtName];
            if (evtlst == undefined) {
                evtlst = [];
                this._events[evtName] = evtlst;
            }

            let info = new EventInfo(classinst, callbackfn);
            evtlst.push(info);
        }
        deregisterAll(classinst) {
            for (let itemkey in this._events) {
                this.deregister(itemkey, classinst)
            }
        }
        deregister(evtName: string, classinst) {
            let evtlst = this._events[evtName];
            if (!evtlst) return;
            while (true) {
                let found = false;
                for (let i = 0; i < evtlst.length; i++) {
                    let info = evtlst[i];
                    if (info.classinst == classinst) {
                        evtlst.splice(i, 1);
                        found = true;
                        break;
                    }
                }

                if (!found)
                    break;
            }
        }
        removeAllFiredEvent(classinst) {
            this.removeFiredEvent("", classinst);
        }
        removeFiredEvent(evtName: string, classinst) {
            let firedEvents = this._firedEvents;
            while (true) {
                let found = false;
                for (let i = 0; i < firedEvents.length; i++) {
                    let evt = firedEvents[i];
                    if ((evtName == "" || evt.evtName == evtName) && evt.evtInfo.classinst == classinst) {
                        firedEvents.splice(i, 1);
                        found = true;
                        break;
                    }
                }

                if (!found)
                    break;
            }
        }
        fire(evtName: string, ...args: any[]) {
            if (!evtName) {
                ERROR_MSG('export class Event::fire: not found eventName!');
                return;
            }

            let evtlst = this._events[evtName];

            if (evtlst == undefined) {
                return;
            }

            // let ars = [];
            // for (let i = 0; i < args.length; i++)
            //     ars.push(args[i]);

            for (let i = 0; i < evtlst.length; i++) {
                let info = evtlst[i];
                if (!this._isPause) {
                    info.callbackfn.apply(info.classinst, args || []);
                } else {
                    let eobj = new FiredEvent(evtName, info, args || []);
                    this._firedEvents.push(eobj);
                }
                // if (args.length < 1) {
                //     info.callbackfn.apply(info.classinst);
                // }
                // else {
                //     info.callbackfn.apply(info.classinst, args);
                // }
            }
        }
        pasue() {
            this._isPause = true;
        }
        resume() {
            this._isPause = false;

            let firedEvents = this._firedEvents;
            while (firedEvents.length > 0) {
                let evt = firedEvents.shift();
                let info = evt.evtInfo;
                let ars = evt.ars;

                if (ars.length < 1) {
                    info.callbackfn.apply(info.classinst);
                }
                else {
                    info.callbackfn.apply(info.classinst, ars);
                }
            }
        }
        clear() {
            this._events = {};
            this._firedEvents.splice(0, this._firedEvents.length);
        }
    }
    export const Event = new Events();
}
/*-----------------------------------------------------------------------------------------
                                                memorystream
-----------------------------------------------------------------------------------------*/
namespace KBEngine {
    export class PackFloatXType {
        _unionData = new ArrayBuffer(4);
        fv = new Float32Array(this._unionData, 0, 1);
        uv = new Uint32Array(this._unionData, 0, 1);
        iv = new Int32Array(this._unionData, 0, 1);
    }

    export const _xPackData = new PackFloatXType();
    export const _yPackData = new PackFloatXType();
    export const _zPackData = new PackFloatXType();

    export class MemoryStream {
        constructor(size_or_buffer: number | ArrayBuffer) {
            if (size_or_buffer instanceof ArrayBuffer) {
                this.buffer = size_or_buffer;
            }
            else {
                this.buffer = new ArrayBuffer(size_or_buffer);
            }

            this.rpos = 0;
            this.wpos = 0;
        }

        buffer: ArrayBuffer;
        rpos: number = 0;
        wpos: number = 0;
        //---------------------------------------------------------------------------------
        readInt8() {
            let buf = new Int8Array(this.buffer, this.rpos, 1);
            this.rpos += 1;
            return buf[0];
        }

        readInt16() {
            let v = this.readUint16();
            if (v >= 32768)
                v -= 65536;
            return v;
        }

        readInt32() {
            let v = this.readUint32();
            if (v >= 2147483648)
                v -= 4294967296;
            return v;
        }

        readInt64() {
            let lo = this.readUint32()
            let hi = this.readUint32()
            return new INT64(lo, hi);
        }

        readUint8() {
            let buf = new Uint8Array(this.buffer, this.rpos, 1);
            this.rpos += 1;
            return buf[0];
        }

        readUint16() {
            let buf = new Uint8Array(this.buffer, this.rpos);
            this.rpos += 2;
            return ((buf[1] & 0xff) << 8) + (buf[0] & 0xff);
        }

        readUint32() {
            let buf = new Uint8Array(this.buffer, this.rpos);
            this.rpos += 4;
            return (buf[3] << 24) + (buf[2] << 16) + (buf[1] << 8) + buf[0];
        }

        readUint64() {
            let lo = this.readUint32()
            let hi = this.readUint32()
            return new UINT64(lo, hi);
        }

        readFloat() {
            let buf;
            try {
                buf = new Float32Array(this.buffer, this.rpos, 1);
            }
            catch (e) {
                buf = new Float32Array(this.buffer.slice(this.rpos, this.rpos + 4));
            }

            this.rpos += 4;
            return buf[0];
        }

        readDouble() {
            let buf;
            try {
                buf = new Float64Array(this.buffer, this.rpos, 1);
            }
            catch (e) {
                buf = new Float64Array(this.buffer.slice(this.rpos, this.rpos + 8), 0, 1);
            }

            this.rpos += 8;
            return buf[0];
        }

        readString() {
            let buf = new Uint8Array(this.buffer, this.rpos);
            let i = 0;
            let s = "";

            while (true) {
                if (buf[i] != 0) {
                    s += String.fromCharCode(buf[i]);
                }
                else {
                    i++;
                    break;
                }

                i++;

                if (this.rpos + i >= this.buffer.byteLength)
                    throw (new Error("export class MemoryStream::readString: rpos(" + (this.rpos + i) + ")>=" +
                        this.buffer.byteLength + " overflow!"));
            }

            this.rpos += i;
            return s;
        }

        readBlob() {
            let size = this.readUint32();
            let buf = new Uint8Array(this.buffer, this.rpos, size);
            this.rpos += size;
            return buf;
        }

        readStream() {
            let buf = new Uint8Array(this.buffer, this.rpos, this.buffer.byteLength - this.rpos);
            this.rpos = this.buffer.byteLength;
            return new MemoryStream(buf);
        }

        readPackXZ() {
            let xPackData = _xPackData;
            let zPackData = _zPackData;

            xPackData.fv[0] = 0.0;
            zPackData.fv[0] = 0.0;

            xPackData.uv[0] = 0x40000000;
            zPackData.uv[0] = 0x40000000;

            let v1 = this.readUint8();
            let v2 = this.readUint8();
            let v3 = this.readUint8();

            let data = 0;
            data |= (v1 << 16);
            data |= (v2 << 8);
            data |= v3;

            xPackData.uv[0] |= (data & 0x7ff000) << 3;
            zPackData.uv[0] |= (data & 0x0007ff) << 15;

            xPackData.fv[0] -= 2.0;
            zPackData.fv[0] -= 2.0;

            xPackData.uv[0] |= (data & 0x800000) << 8;
            zPackData.uv[0] |= (data & 0x000800) << 20;

            let d = new Array(2);
            d[0] = xPackData.fv[0];
            d[1] = zPackData.fv[0];
            return d;
        }

        readPackY() {
            let v = this.readUint16();

            let yPackData = _yPackData;
            yPackData.uv[0] = 0x40000000;
            yPackData.uv[0] |= (v & 0x7fff) << 12;
            yPackData.fv[0] -= 2.0;
            yPackData.uv[0] |= (v & 0x8000) << 16;
            return yPackData.fv[0];
        }

        //---------------------------------------------------------------------------------
        writeInt8(v) {
            let buf = new Int8Array(this.buffer, this.wpos, 1);
            buf[0] = v;
            this.wpos += 1;
        }

        writeInt16(v) {
            this.writeInt8(v & 0xff);
            this.writeInt8(v >> 8 & 0xff);
        }

        writeInt32(v) {
            for (let i = 0; i < 4; i++)
                this.writeInt8(v >> i * 8 & 0xff);
        }

        writeInt64(v) {
            this.writeInt32(v.lo);
            this.writeInt32(v.hi);
        }

        writeUint8(v) {
            let buf = new Uint8Array(this.buffer, this.wpos, 1);
            buf[0] = v;
            this.wpos += 1;
        }

        writeUint16(v) {
            this.writeUint8(v & 0xff);
            this.writeUint8(v >> 8 & 0xff);
        }

        writeUint32(v) {
            for (let i = 0; i < 4; i++)
                this.writeUint8(v >> i * 8 & 0xff);
        }

        writeUint64(v: UINT64) {
            this.writeUint32(v.lo);
            this.writeUint32(v.hi);
        }

        writeFloat(v) {
            try {
                let buf = new Float32Array(this.buffer, this.wpos, 1);
                buf[0] = v;
            }
            catch (e) {
                let buf = new Float32Array(1);
                buf[0] = v;
                let buf1 = new Uint8Array(this.buffer);
                let buf2 = new Uint8Array(buf.buffer);
                buf1.set(buf2, this.wpos);
            }

            this.wpos += 4;
        }

        writeDouble(v) {
            try {
                let buf = new Float64Array(this.buffer, this.wpos, 1);
                buf[0] = v;
            }
            catch (e) {
                let buf = new Float64Array(1);
                buf[0] = v;
                let buf1 = new Uint8Array(this.buffer);
                let buf2 = new Uint8Array(buf.buffer);
                buf1.set(buf2, this.wpos);
            }

            this.wpos += 8;
        }

        writeBlob(v) {
            let size = v.length;
            if (size + 4 > this.space()) {
                ERROR_MSG("memorystream::writeBlob: no free!");
                return;
            }

            this.writeUint32(size);
            let buf = new Uint8Array(this.buffer, this.wpos, size);

            if (typeof (v) == "string") {
                for (let i = 0; i < size; i++) {
                    buf[i] = v.charCodeAt(i);
                }
            }
            else {
                for (let i = 0; i < size; i++) {
                    buf[i] = v[i];
                }
            }

            this.wpos += size;
        }

        writeString(v) {
            if (v.length > this.space()) {
                ERROR_MSG("memorystream::writeString: no free!");
                return;
            }

            let buf = new Uint8Array(this.buffer, this.wpos);
            let i = 0;
            for (let idx = 0; idx < v.length; idx++) {
                buf[i++] = v.charCodeAt(idx);
            }

            buf[i++] = 0;
            this.wpos += i;
        }
        append(stream: MemoryStream, offset: number, size: number) {
            if (size > this.space()) {
                this.buffer = ArrayBuffer['transfer'](this.buffer, this.buffer.byteLength + size * 2);
            }

            let buf = new Uint8Array(this.buffer, this.wpos, size);
            buf.set(new Uint8Array(stream.buffer, offset, size), 0);
            this.wpos += size;
        }

        //---------------------------------------------------------------------------------
        readSkip(v) {
            this.rpos += v;
        }

        //---------------------------------------------------------------------------------
        space() {
            return this.buffer.byteLength - this.wpos;
        }

        //---------------------------------------------------------------------------------
        length() {
            return this.wpos - this.rpos;
        }

        //---------------------------------------------------------------------------------
        readEOF() {
            return this.buffer.byteLength - this.rpos <= 0;
        }

        //---------------------------------------------------------------------------------
        done() {
            this.rpos = this.wpos;
        }

        //---------------------------------------------------------------------------------
        getbuffer() {
            return this.buffer.slice(this.rpos, this.wpos);
        }
        setbuffer(buffer: ArrayBuffer) {
            this.clear();
            this.buffer = buffer;
        }
        size() {
            return this.buffer.byteLength;
        }
        clear() {
            this.rpos = this.wpos = 0;
            if (this.buffer.byteLength > PACKET_MAX_SIZE) {
                this.buffer = new ArrayBuffer(PACKET_MAX_SIZE)
            }
        }
        reclaimObject() {
            this.clear()
            if (MemoryStream._objects != undefined) {
                MemoryStream._objects.push(this)
            }
        }
    }
    export module MemoryStream {
        export const _objects: MemoryStream[] = []
        export class PackFloatXType {
            _unionData: ArrayBuffer;
            fv: Float32Array;
            uv: Uint32Array;
            iv: Int32Array;
            constructor() {
                this._unionData = new ArrayBuffer(4);
                this.fv = new Float32Array(this._unionData, 0, 1);
                this.uv = new Uint32Array(this._unionData, 0, 1);
                this.iv = new Int32Array(this._unionData, 0, 1);
            };
        }
        export function createObject() {
            return MemoryStream._objects.length > 0 ? MemoryStream._objects.pop() : new MemoryStream(PACKET_MAX_SIZE_TCP);
        }
    }
}
/*-----------------------------------------------------------------------------------------
                                                bundle
-----------------------------------------------------------------------------------------*/
namespace KBEngine {
    export class Bundle {
        static _objects: Bundle[] = []
        static createObject() {
            return Bundle._objects.length > 0 ? Bundle._objects.pop() : new Bundle();
        }
        constructor() {
            this.stream = MemoryStream.createObject();
        }
        memorystreams: Array<MemoryStream> = new Array();
        stream: MemoryStream;
        numMessage: number = 0;
        messageLengthBuffer: Uint8Array = null;
        msgtype = null;
        messageLength: number = 0;
        //---------------------------------------------------------------------------------
        newMessage(msgtype) {
            this.fini(false);

            this.msgtype = msgtype;
            this.numMessage += 1;

            if (this.msgtype.length == -1) {
                this.messageLengthBuffer = new Uint8Array(this.stream.buffer, this.stream.wpos + MESSAGE_ID_LENGTH, 2);
            }

            this.writeUint16(msgtype.id);

            if (this.messageLengthBuffer) {
                this.writeUint16(0);
                this.messageLengthBuffer[0] = 0;
                this.messageLengthBuffer[1] = 0;
                this.messageLength = 0;
            }
        }

        //---------------------------------------------------------------------------------
        writeMsgLength(v) {
            if (this.messageLengthBuffer) {
                this.messageLengthBuffer[0] = v & 0xff;
                this.messageLengthBuffer[1] = v >> 8 & 0xff;
            }
        }

        //---------------------------------------------------------------------------------
        fini(issend) {
            if (this.numMessage > 0) {
                this.writeMsgLength(this.messageLength);
                if (this.stream)
                    this.memorystreams.push(this.stream);

                this.stream = MemoryStream.createObject();
            }

            if (issend) {
                this.messageLengthBuffer = null;
                this.numMessage = 0;
                this.msgtype = null;
            }
        }

        //---------------------------------------------------------------------------------
        send(network) {
            this.fini(true);

            for (let i = 0; i < this.memorystreams.length; i++) {
                let tmpStream = this.memorystreams[i];
                network.send(tmpStream.getbuffer());
            }

            this.reclaimObject();
        }

        //---------------------------------------------------------------------------------
        checkStream(v) {
            if (v > this.stream.space()) {
                this.memorystreams.push(this.stream);
                this.stream = MemoryStream.createObject();
            }

            this.messageLength += v;
        }

        //---------------------------------------------------------------------------------
        writeInt8(v) {
            this.checkStream(1);
            this.stream.writeInt8(v);
        }

        writeInt16(v) {
            this.checkStream(2);
            this.stream.writeInt16(v);
        }

        writeInt32(v) {
            this.checkStream(4);
            this.stream.writeInt32(v);
        }

        writeInt64(v) {
            this.checkStream(8);
            this.stream.writeInt64(v);
        }

        writeUint8(v) {
            this.checkStream(1);
            this.stream.writeUint8(v);
        }

        writeUint16(v) {
            this.checkStream(2);
            this.stream.writeUint16(v);
        }

        writeUint32(v) {
            this.checkStream(4);
            this.stream.writeUint32(v);
        }

        writeUint64(v) {
            this.checkStream(8);
            this.stream.writeUint64(v);
        }

        writeFloat(v) {
            this.checkStream(4);
            this.stream.writeFloat(v);
        }

        writeDouble(v) {
            this.checkStream(8);
            this.stream.writeDouble(v);
        }

        writeString(v) {
            this.checkStream(v.length + 1);
            this.stream.writeString(v);
        }

        writeBlob(v) {
            this.checkStream(v.length + 4);
            this.stream.writeBlob(v);
        }
        clear() {
            for (let i = 0; i < this.memorystreams.length; i++) {
                if (this.stream != this.memorystreams[i])
                    this.memorystreams[i].reclaimObject();
            }

            if (this.stream)
                this.stream.clear();
            else
                this.stream = MemoryStream.createObject();

            this.memorystreams = new Array();
            this.numMessage = 0;
            this.messageLengthBuffer = null;
            this.messageLength = 0;
            this.msgtype = null;
        }
        reclaimObject() {
            this.clear();

            if (Bundle._objects != undefined)
                Bundle._objects.push(this);
        }
    }
    export const reader = new MemoryStream(0);
    export interface IDataType2Id {
        [type: string]: number;
    }
    export let datatype2id: IDataType2Id = {};

    export function mappingDataType() {
        datatype2id = {};
        datatype2id["STRING"] = 1;
        datatype2id["STD::STRING"] = 1;

        datatype2id["UINT8"] = 2;
        datatype2id["BOOL"] = 2;
        datatype2id["DATATYPE"] = 2;
        datatype2id["CHAR"] = 2;
        datatype2id["DETAIL_TYPE"] = 2;
        datatype2id["ENTITYCALL_CALL_TYPE"] = 2;

        datatype2id["UINT16"] = 3;
        datatype2id["UNSIGNED SHORT"] = 3;
        datatype2id["SERVER_ERROR_CODE"] = 3;
        datatype2id["ENTITY_TYPE"] = 3;
        datatype2id["ENTITY_PROPERTY_UID"] = 3;
        datatype2id["ENTITY_METHOD_UID"] = 3;
        datatype2id["ENTITY_SCRIPT_UID"] = 3;
        datatype2id["DATATYPE_UID"] = 3;

        datatype2id["UINT32"] = 4;
        datatype2id["UINT"] = 4;
        datatype2id["UNSIGNED INT"] = 4;
        datatype2id["ARRAYSIZE"] = 4;
        datatype2id["SPACE_ID"] = 4;
        datatype2id["GAME_TIME"] = 4;
        datatype2id["TIMER_ID"] = 4;

        datatype2id["UINT64"] = 5;
        datatype2id["DBID"] = 5;
        datatype2id["COMPONENT_ID"] = 5;

        datatype2id["INT8"] = 6;
        datatype2id["COMPONENT_ORDER"] = 6;

        datatype2id["INT16"] = 7;
        datatype2id["SHORT"] = 7;

        datatype2id["INT32"] = 8;
        datatype2id["INT"] = 8;
        datatype2id["ENTITY_ID"] = 8;
        datatype2id["CALLBACK_ID"] = 8;
        datatype2id["COMPONENT_TYPE"] = 8;

        datatype2id["INT64"] = 9;

        datatype2id["PYTHON"] = 10;
        datatype2id["PY_DICT"] = 10;
        datatype2id["PY_TUPLE"] = 10;
        datatype2id["PY_LIST"] = 10;
        datatype2id["ENTITYCALL"] = 10;

        datatype2id["BLOB"] = 11;

        datatype2id["UNICODE"] = 12;

        datatype2id["FLOAT"] = 13;

        datatype2id["DOUBLE"] = 14;

        datatype2id["VECTOR2"] = 15;

        datatype2id["VECTOR3"] = 16;

        datatype2id["VECTOR4"] = 17;

        datatype2id["FIXED_DICT"] = 18;

        datatype2id["ARRAY"] = 19;

        datatype2id["ENTITYCALL"] = 20;
    }
    mappingDataType();

    export function bindWriter(writer, argType: number) {
        switch (argType) {
            case datatype2id["UINT8"]: return writer.writeUint8;
            case datatype2id["UINT16"]: return writer.writeUint16;
            case datatype2id["UINT32"]: return writer.writeUint32;
            case datatype2id["UINT64"]: return writer.writeUint64;
            case datatype2id["INT8"]: return writer.writeInt8;
            case datatype2id["INT16"]: return writer.writeInt16;
            case datatype2id["INT32"]: return writer.writeInt32;
            case datatype2id["INT64"]: return writer.writeInt64;
            case datatype2id["FLOAT"]: return writer.writeFloat;
            case datatype2id["DOUBLE"]: return writer.writeDouble;
            case datatype2id["STRING"]: return writer.writeString;
            case datatype2id["FIXED_DICT"]: return writer.writeStream;
            case datatype2id["ARRAY"]: return writer.writeStream;
            default: return writer.writeStream;
        }
    }
    export function bindReader(argType: number) {
        switch (argType) {
            case datatype2id["UINT8"]: return reader.readUint8;
            case datatype2id["UINT16"]: return reader.readUint16;
            case datatype2id["UINT32"]: return reader.readUint32;
            case datatype2id["UINT64"]: return reader.readUint64;
            case datatype2id["INT8"]: return reader.readInt8;
            case datatype2id["INT16"]: return reader.readInt16;
            case datatype2id["INT32"]: return reader.readInt32;
            case datatype2id["INT64"]: return reader.readInt64;
            case datatype2id["FLOAT"]: return reader.readFloat;
            case datatype2id["DOUBLE"]: return reader.readDouble;
            case datatype2id["STRING"]: return reader.readString;
            case datatype2id["FIXED_DICT"]: return reader.readStream;
            case datatype2id["ARRAY"]: return reader.readStream;
            default: return reader.readStream;
        }
    }
    export class Message {
        constructor(public id, public name, public length, public argsType, public args, public handler) {
            for (let i = 0; i < args.length; i++) {
                args[i] = bindReader(args[i]);
            }
        }
        createFromStream(msgstream) {
            if (this.args.length <= 0)
                return msgstream;

            let result = new Array(this.args.length);
            for (let i = 0; i < this.args.length; i++) {
                result[i] = this.args[i].call(msgstream);
            }

            return result;
        }

        handleMessage(msgstream) {
            if (this.handler == null) {
                ERROR_MSG("Message::handleMessage: interface(" + this.name + "/" + this.id + ") no implement!");
                return;
            }

            if (this.args.length <= 0) {
                if (this.argsType < 0)
                    this.handler(msgstream);
                else
                    this.handler();
            }
            else {
                this.handler.apply(app, this.createFromStream(msgstream));
            }
        }
    }

    export module messages {
        export const loginapp = {};
        export const baseapp = {};
        export const Loginapp_importClientMessages = new Message(5, "importClientMessages", 0, 0, new Array(), null);
        export const Baseapp_importClientMessages = new Message(207, "importClientMessages", 0, 0, new Array(), null);
        export const Baseapp_importClientEntityDef = new Message(208, "importClientEntityDef", 0, 0, new Array(), null);
        export const onImportClientMessages = new Message(518, "onImportClientMessages", -1, -1, new Array(), null);
    }
    export let clientmessages = {};
    export let bufferedCreateEntityMessages = {};
}
/*-----------------------------------------------------------------------------------------
                                            math
-----------------------------------------------------------------------------------------*/
namespace KBEngine {
    export class Vector2 {
        constructor(public x: number, public y: number) {
        }
        distance(pos: Vector2) {
            let x = pos.x - this.x;
            let y = pos.y - this.y;
            return Math.sqrt(x * x + y * y);
        }
        add(vec2: Vector2) {
            this.x += vec2.x;
            this.y += vec2.y;
            return this;
        }

        sub(vec2: Vector2) {
            this.x -= vec2.x;
            this.y -= vec2.y;
            return this;
        }

        mul(num: number) {
            this.x *= num;
            this.y *= num;
            return this;
        }

        div(num: number) {
            this.x /= num;
            this.y /= num;
            return this;
        }

        neg() {
            this.x = -this.x;
            this.y = -this.y;
            return this;
        }
    }
    export class Vector3 {
        constructor(public x: number, public y: number, public z: number) {
            this.x = x;
            this.y = y;
            this.z = z;
        }
        distance(pos: Vector3) {
            let x = pos.x - this.x;
            let y = pos.y - this.y;
            let z = pos.z - this.z;
            return Math.sqrt(x * x + y * y + z * z);
        }

        //向量加法
        add(vec3: Vector3) {
            this.x += vec3.x;
            this.y += vec3.y;
            this.z += vec3.z;
            return this;
        }

        //向量减法
        sub(vec3: Vector3) {
            this.x -= vec3.x;
            this.y -= vec3.y;
            this.z -= vec3.z;
            return this;
        }

        //向量乘法
        mul(num: number) {
            this.x *= num;
            this.y *= num;
            this.z *= num;
            return this;
        }

        //向量除法
        div(num: number) {
            this.x /= num;
            this.y /= num;
            this.z /= num;
            return this;
        }

        // 向量取反
        neg() {
            this.x = -this.x;
            this.y = -this.y;
            this.z = -this.z;
            return this;
        }
    }
    export class Vector4 {
        constructor(public x: number, public y: number, public z: number, public w: number) {
            this.x = x;
            this.y = y;
            this.z = z;
            this.w = w;
        }
        distance(pos: Vector4) {
            let x = pos.x - this.x;
            let y = pos.y - this.y;
            let z = pos.z - this.z;
            let w = pos.w - this.w;
            return Math.sqrt(x * x + y * y + z * z + w * w);
        }

        add(vec4: Vector4) {
            this.x += vec4.x;
            this.y += vec4.y;
            this.z += vec4.z;
            this.w += vec4.w;
            return this;
        }

        sub(vec4: Vector4) {
            this.x -= vec4.x;
            this.y -= vec4.y;
            this.z -= vec4.z;
            this.w -= vec4.w;
            return this;
        }

        mul(num: number) {
            this.x *= num;
            this.y *= num;
            this.z *= num;
            this.w *= num;
            return this;
        }
        div(num: number) {
            this.x /= num;
            this.y /= num;
            this.z /= num;
            this.w /= num;
            return this;
        }

        neg() {
            this.x = -this.x;
            this.y = -this.y;
            this.z = -this.z;
            this.w = -this.w;
            return this;
        }
    }
    export function clampf(value, min_inclusive, max_inclusive) {
        if (min_inclusive > max_inclusive) {
            let temp = min_inclusive;
            min_inclusive = max_inclusive;
            max_inclusive = temp;
        }
        return value < min_inclusive ? min_inclusive : value < max_inclusive ? value : max_inclusive;
    }
    export function int82angle(angle: number, half: boolean) {
        return angle * (Math.PI / (half ? 254.0 : 128.0));
    }
    export function angle2int8(v: number, half: boolean) {
        let angle = 0;
        if (!half) {
            //todo 原来写的float(Math.PI)，因为js没有float这个方法所以去掉了
            angle = Math.floor((v * 128.0) / Math.PI + 0.5);
        }
        else {
            angle = clampf(Math.floor((v * 254.0) / Math.PI + 0.5), -128.0, 127.0);
        }

        return angle;
    }
}
/*-----------------------------------------------------------------------------------------
                                            entity
-----------------------------------------------------------------------------------------*/

namespace KBEngine {
    export module Entities { }

    export class Entity {
        constructor() {

        }
        id: number = 0;
        className: string = "";
        position: Vector3 = new Vector3(0, 0, 0);
        direction: Vector3 = new Vector3(0, 0, 0);
        velocity: number = 0;

        cell = null;
        base = null;

        // enterworld之后设置为true
        inWorld = false;

        // __init__调用之后设置为true
        inited = false;

        // 是否被控制
        isControlled = false;

        entityLastLocalPos = new Vector3(0.0, 0.0, 0.0);
        entityLastLocalDir = new Vector3(0.0, 0.0, 0.0);

        // 玩家是否在地面上
        isOnGround = false;

        __init__() {

        }
        callPropertysSetMethods() {
            let currModule = moduledefs[this.className];
            for (let name in currModule.propertys) {
                let propertydata = currModule.propertys[name];
                let properUtype = propertydata[0];
                name = propertydata[2];
                let setmethod = propertydata[5];
                let flags = propertydata[6];
                let oldval = this[name];

                if (setmethod != null) {
                    // base类属性或者进入世界后cell类属性会触发set_*方法
                    // ED_FLAG_BASE_AND_CLIENT、ED_FLAG_BASE
                    if (flags == 0x00000020 || flags == 0x00000040) {
                        if (this.inited && !this.inWorld)
                            setmethod.call(this, oldval);
                    }
                    else {
                        if (this.inWorld) {
                            if (flags == 0x00000008 || flags == 0x00000010) {
                                if (!this.isPlayer())
                                    continue;
                            }

                            setmethod.call(this, oldval);
                        }
                    }
                }
            };
        }
        onDestroy() {

        }
        onControlled(bIsControlled) {

        }
        isPlayer() {
            return this.id == app.entity_id;
        }
        baseCall(type: string, ...params: any[]) {
            // if (params.length < 1) {
            //     ERROR_MSG('Entity::baseCall: not fount interfaceName!');
            //     return;
            // }

            if (this.base == undefined) {
                ERROR_MSG('Entity::baseCall: base is None!');
                return;
            }

            let method = moduledefs[this.className].base_methods[type];

            if (method == undefined) {
                ERROR_MSG("Entity::baseCall: The server did not find the def_method(" + this.className + "." + type + ")!");
                return;
            }

            let methodID = method[0];
            let args = method[3];

            if (params.length != args.length) {
                ERROR_MSG("Entity::baseCall: args(" + (params.length - 1) + "!= " + args.length + ") size is error!");
                return;
            }

            this.base.newCall();
            this.base.bundle.writeUint16(methodID);

            try {
                for (let i = 0; i < params.length; i++) {
                    if (args[i].isSameType(params[i])) {
                        args[i].addToStream(this.base.bundle, params[i]);
                    }
                    else {
                        throw new Error("Entity::baseCall: arg[" + i + "] is error!");
                    }
                }
            }
            catch (e) {
                ERROR_MSG(e.toString());
                ERROR_MSG('Entity::baseCall: args is error!');
                this.base.bundle = null;
                return;
            }

            this.base.sendCall();
        }
        cellCall(type: string, ...params: any[]) {
            // if (params.length < 1) {
            //     ERROR_MSG('Entity::cellCall: not fount interfaceName!');
            //     return;
            // }

            if (this.cell == undefined) {
                ERROR_MSG('Entity::cellCall: cell is None!');
                return;
            }

            let method = moduledefs[this.className].cell_methods[type];

            if (method == undefined) {
                ERROR_MSG("Entity::cellCall: The server did not find the def_method(" + this.className + "." + type + ")!");
                return;
            }

            let methodID = method[0];
            let args = method[3];

            if (params.length != args.length) {
                ERROR_MSG("Entity::cellCall: args(" + (params.length) + "!= " + args.length + ") size is error!");
                return;
            }

            this.cell.newCall();
            this.cell.bundle.writeUint16(methodID);

            try {
                for (let i = 0; i < args.length; i++) {
                    if (args[i].isSameType(params[i])) {
                        args[i].addToStream(this.cell.bundle, params[i]);
                    }
                    else {
                        throw new Error("Entity::cellCall: arg[" + i + "] is error!");
                    }
                }
            }
            catch (e) {
                ERROR_MSG(e.toString());
                ERROR_MSG('Entity::cellCall: args is error!');
                this.cell.bundle = null;
                return;
            }

            this.cell.sendCall();
        }
        enterWorld() {
            INFO_MSG(this.className + '::enterWorld: ' + this.id);
            this.inWorld = true;
            this.onEnterWorld();

            Event.fire("onEnterWorld", this);
        }
        onEnterWorld() {

        }
        leaveWorld() {
            INFO_MSG(this.className + '::leaveWorld: ' + this.id);
            this.inWorld = false;
            this.onLeaveWorld();
            Event.fire("onLeaveWorld", this);
        }
        onLeaveWorld() {

        }
        enterSpace() {
            INFO_MSG(this.className + '::enterSpace: ' + this.id);
            this.onEnterSpace();
            Event.fire("onEnterSpace", this);

            // 要立即刷新表现层对象的位置
            Event.fire("set_position", this);
            Event.fire("set_direction", this);
        }
        onEnterSpace() {

        }
        leaveSpace() {
            INFO_MSG(this.className + '::leaveSpace: ' + this.id);
            this.onLeaveSpace();
            Event.fire("onLeaveSpace", this);
        }
        onLeaveSpace() {

        }
        set_position() {
            // DEBUG_MSG(this.className + "::set_position: " + old);  
            if (this.isPlayer()) {
                app.entityServerPos.x = this.position.x;
                app.entityServerPos.y = this.position.y;
                app.entityServerPos.z = this.position.z;
            }

            Event.fire("set_position", this);
        }
        onUpdateVolatileData() {

        }
        set_direction(old) {
            // DEBUG_MSG(this.className + "::set_direction: " + old);  
            Event.fire("set_direction", this);
        }
    }
    export function registerEntity(name: string) {
        return (ctor: new () => Entity) => {
            KBEngine['Entities'] = KBEngine['Entities'] || {}
            KBEngine['Entities'][name] = ctor;
        }
    }
}
/*-----------------------------------------------------------------------------------------
                                                EntityCall
-----------------------------------------------------------------------------------------*/
namespace KBEngine {
    export const ENTITYCALL_TYPE_CELL = 0;
    export const ENTITYCALL_TYPE_BASE = 1;

    //这个东西好像没有同步给客户端
    export class EntityComponent {

    }

    export class EntityCall {
        constructor() {

        }
        id: number = 0;
        className = '';
        type: number = ENTITYCALL_TYPE_CELL;
        networkInterface = app;
        bundle = null;

        isBase() {
            return this.type == ENTITYCALL_TYPE_BASE;
        }
        isCell() {
            return this.type == ENTITYCALL_TYPE_CELL;
        }
        newCall() {
            if (this.bundle == null)
                this.bundle = Bundle.createObject();

            if (this.type == ENTITYCALL_TYPE_CELL)
                this.bundle.newMessage(messages['Baseapp_onRemoteCallCellMethodFromClient']);
            else
                this.bundle.newMessage(messages['Entity_onRemoteMethodCall']);

            this.bundle.writeInt32(this.id);

            return this.bundle;
        }
        sendCall(bundle) {
            if (bundle == undefined)
                bundle = this.bundle;

            bundle.send(this.networkInterface);

            if (this.bundle == bundle)
                this.bundle = null;
        }
    }

    export class DATATYPE_UINT8 {
        bind() {
        }

        createFromStream(stream) {
            return reader.readUint8.call(stream);
        }

        addToStream(stream, v) {
            stream.writeUint8(v);
        }

        parseDefaultValStr(v) {
            return parseInt(v);
        }

        isSameType(v) {
            if (typeof (v) != "number") {
                return false;
            }

            if (v < 0 || v > 0xff) {
                return false;
            }

            return true;
        }
    }
    export class DATATYPE_UINT16 {
        bind() {
        }

        createFromStream(stream) {
            return reader.readUint16.call(stream);
        }

        addToStream(stream, v) {
            stream.writeUint16(v);
        }

        parseDefaultValStr(v) {
            return parseInt(v);
        }

        isSameType(v) {
            if (typeof (v) != "number") {
                return false;
            }

            if (v < 0 || v > 0xffff) {
                return false;
            }

            return true;
        }
    }
    export class DATATYPE_UINT32 {
        bind() {
        }
        createFromStream(stream) {
            return reader.readUint32.call(stream);
        }

        addToStream(stream, v) {
            stream.writeUint32(v);
        }

        parseDefaultValStr(v) {
            return parseInt(v);
        }

        isSameType(v) {
            if (typeof (v) != "number") {
                return false;
            }

            if (v < 0 || v > 0xffffffff) {
                return false;
            }

            return true;
        }
    }
    export class DATATYPE_UINT64 {
        bind() {
        }

        createFromStream(stream) {
            return reader.readUint64.call(stream);
        }

        addToStream(stream, v) {
            stream.writeUint64(v);
        }

        parseDefaultValStr(v) {
            return parseInt(v);
        }

        isSameType(v) {
            return v instanceof UINT64;
        }
    }
    export class DATATYPE_INT8 {
        bind() {
        }

        createFromStream(stream) {
            return reader.readInt8.call(stream);
        }

        addToStream(stream, v) {
            stream.writeInt8(v);
        }

        parseDefaultValStr(v) {
            return parseInt(v);
        }

        isSameType(v) {
            if (typeof (v) != "number") {
                return false;
            }

            if (v < -0x80 || v > 0x7f) {
                return false;
            }

            return true;
        }
    }
    export class DATATYPE_INT16 {
        bind() {
        }

        createFromStream(stream) {
            return reader.readInt16.call(stream);
        }

        addToStream(stream, v) {
            stream.writeInt16(v);
        }

        parseDefaultValStr(v) {
            return parseInt(v);
        }

        isSameType(v) {
            if (typeof (v) != "number") {
                return false;
            }

            if (v < -0x8000 || v > 0x7fff) {
                return false;
            }

            return true;
        }
    }
    export class DATATYPE_INT32 {
        bind() {
        }

        createFromStream(stream) {
            return reader.readInt32.call(stream);
        }

        addToStream(stream, v) {
            stream.writeInt32(v);
        }

        parseDefaultValStr(v) {
            return parseInt(v);
        }

        isSameType(v) {
            if (typeof (v) != "number") {
                return false;
            }

            if (v < -0x80000000 || v > 0x7fffffff) {
                return false;
            }

            return true;
        }
    }
    export class DATATYPE_INT64 {
        bind() {
        }

        createFromStream(stream) {
            return reader.readInt64.call(stream);
        }

        addToStream(stream, v) {
            stream.writeInt64(v);
        }

        parseDefaultValStr(v) {
            return parseInt(v);
        }

        isSameType(v) {
            return v instanceof INT64;
        }
    }
    export class DATATYPE_FLOAT {
        bind() {
        }

        createFromStream(stream) {
            return reader.readFloat.call(stream);
        }

        addToStream(stream, v) {
            stream.writeFloat(v);
        }

        parseDefaultValStr(v) {
            return parseFloat(v);
        }

        isSameType(v) {
            return typeof (v) == "number";
        }
    }
    export class DATATYPE_DOUBLE extends DATATYPE_FLOAT {
        createFromStream(stream) {
            return reader.readDouble.call(stream);
        }

        addToStream(stream, v) {
            stream.writeDouble(v);
        }
    }
    export class DATATYPE_STRING {
        bind() {
        }

        createFromStream(stream) {
            return reader.readString.call(stream);
        }

        addToStream(stream, v) {
            stream.writeString(v);
        }

        parseDefaultValStr(v) {
            if (typeof (v) == "string")
                return v;

            return "";
        }

        isSameType(v) {
            return typeof (v) == "string";
        }
    }
    export class DATATYPE_VECTOR2 {
        bind() {
        }

        createFromStream(stream) {
            if (CLIENT_NO_FLOAT) {
                let x = reader.readInt32.call(stream)
                let y = reader.readInt32.call(stream)
                return new Vector2(x, y);
            }
            else {
                let x = reader.readFloat.call(stream)
                let y = reader.readFloat.call(stream)
                return new Vector2(x, y);
            }
        }

        addToStream(stream, v) {
            if (CLIENT_NO_FLOAT) {
                stream.writeInt32(v.x);
                stream.writeInt32(v.y);
            }
            else {
                stream.writeFloat(v.x);
                stream.writeFloat(v.y);
            }
        }

        parseDefaultValStr(v) {
            return new Vector2(0.0, 0.0);;
        }

        isSameType(v) {
            if (!(v instanceof Vector2)) {
                return false;
            }

            return true;
        }
    }
    export class DATATYPE_VECTOR3 {
        bind() {
        }

        createFromStream(stream) {
            if (CLIENT_NO_FLOAT) {
                return new Vector3(reader.readInt32.call(stream),
                    reader.readInt32.call(stream), reader.readInt32.call(stream));
            }
            else {
                return new Vector3(reader.readFloat.call(stream),
                    reader.readFloat.call(stream), reader.readFloat.call(stream));
            }
        }

        addToStream(stream, v) {
            if (CLIENT_NO_FLOAT) {
                stream.writeInt32(v.x);
                stream.writeInt32(v.y);
                stream.writeInt32(v.z);
            }
            else {
                stream.writeFloat(v.x);
                stream.writeFloat(v.y);
                stream.writeFloat(v.z);
            }
        }

        parseDefaultValStr(v) {
            return new Vector3(0.0, 0.0, 0.0);
        }

        isSameType(v) {
            if (!(v instanceof Vector3)) {
                return false;
            }

            return true;
        }
    }
    export class DATATYPE_VECTOR4 {
        bind() {
        }

        createFromStream(stream) {
            if (CLIENT_NO_FLOAT) {
                return new Vector4(reader.readInt32.call(stream),
                    reader.readInt32.call(stream),
                    reader.readInt32.call(stream),
                    reader.readInt32.call(stream));
            }
            else {
                return new Vector4(reader.readFloat.call(stream),
                    reader.readFloat.call(stream),
                    reader.readFloat.call(stream),
                    reader.readFloat.call(stream));
            }
        }

        addToStream(stream, v) {
            if (CLIENT_NO_FLOAT) {
                stream.writeInt32(v.x);
                stream.writeInt32(v.y);
                stream.writeInt32(v.z);
                stream.writeInt32(v.w);
            }
            else {
                stream.writeFloat(v.x);
                stream.writeFloat(v.y);
                stream.writeFloat(v.z);
                stream.writeFloat(v.w);
            }
        }

        parseDefaultValStr(v) {
            return new Vector4(0.0, 0.0, 0.0, 0.0);
        }

        isSameType(v) {
            if (!(v instanceof Vector4)) {
                return false;
            }

            return true;
        }
    }
    export class DATATYPE_PYTHON {
        bind() {
        }

        createFromStream(stream) {
            return stream.readBlob();
        }

        addToStream(stream, v) {
            stream.writeBlob(v);
        }

        parseDefaultValStr(v) {
            return new Uint8Array(0);
        }

        isSameType(v) {
            return false;
        }
    }
    export class DATATYPE_UNICODE {
        bind() {
        }

        createFromStream(stream) {
            return utf8ArrayToString(reader.readBlob.call(stream));
        }

        addToStream(stream, v) {
            stream.writeBlob(stringToUTF8Bytes(v));
        }

        parseDefaultValStr(v) {
            if (typeof (v) == "string")
                return v;

            return "";
        }

        isSameType(v) {
            return typeof (v) == "string";
        }
    }
    export class DATATYPE_ENTITY_COMPONENT {
        bind() {
        }

        createFromStream(stream) {
        }

        addToStream(stream, v) {
        }

        parseDefaultValStr(v) {
            return new Uint8Array(0);;
        }

        isSameType(v) {
            return false;
        }
    }
    export class DATATYPE_ENTITYCALL {
        bind() {
        }

        createFromStream(stream) {
        }

        addToStream(stream, v) {
        }

        parseDefaultValStr(v) {
            return new Uint8Array(0);;
        }

        isSameType(v) {
            return false;
        }
    }
    export class DATATYPE_BLOB {
        bind() {
        }

        createFromStream(stream) {
            let size = reader.readUint32.call(stream);
            let buf = new Uint8Array(stream.buffer, stream.rpos, size);
            stream.rpos += size;
            return buf;
        }

        addToStream(stream, v) {
            stream.writeBlob(v);
        }

        parseDefaultValStr(v) {
            return new Uint8Array(0);
        }

        isSameType(v) {
            return true;
        }
    }
    export class DATATYPE_ARRAY {
        type = null;

        bind() {
            if (typeof (this.type) == "number")
                this.type = datatypes[this.type];
        }

        createFromStream(stream) {
            let size = stream.readUint32();
            let datas = [];

            while (size > 0) {
                size--;
                datas.push(this.type.createFromStream(stream));
            };

            return datas;
        }

        addToStream(stream, v) {
            stream.writeUint32(v.length);
            for (let i = 0; i < v.length; i++) {
                this.type.addToStream(stream, v[i]);
            }
        }

        parseDefaultValStr(v) {
            return [];
        }

        isSameType(v) {
            for (let i = 0; i < v.length; i++) {
                if (!this.type.isSameType(v[i])) {
                    return false;
                }
            }

            return true;
        }
    }
    export class DATATYPE_FIXED_DICT {
        dicttype = {};
        implementedBy = null;

        bind() {
            for (let itemkey in this.dicttype) {
                let utype = this.dicttype[itemkey];

                if (typeof (this.dicttype[itemkey]) == "number")
                    this.dicttype[itemkey] = datatypes[utype];
            }
        }

        createFromStream(stream) {
            let datas = {};
            for (let itemkey in this.dicttype) {
                datas[itemkey] = this.dicttype[itemkey].createFromStream(stream);
            }

            return datas;
        }

        addToStream(stream, v) {
            for (let itemkey in this.dicttype) {
                this.dicttype[itemkey].addToStream(stream, v[itemkey]);
            }
        }

        parseDefaultValStr(v) {
            return {};
        }

        isSameType(v) {
            for (let itemkey in this.dicttype) {
                if (!this.dicttype[itemkey].isSameType(v[itemkey])) {
                    return false;
                }
            }

            return true;
        }
    }

    export module datatypes {
        export const UINT8 = new DATATYPE_UINT8();
        export const UINT16 = new DATATYPE_UINT16();
        export const UINT32 = new DATATYPE_UINT32();
        export const UINT64 = new DATATYPE_UINT64();

        export const INT8 = new DATATYPE_INT8();
        export const INT16 = new DATATYPE_INT16();
        export const INT32 = new DATATYPE_INT32();
        export const INT64 = new DATATYPE_INT64();

        export const FLOAT = new DATATYPE_FLOAT();
        export const DOUBLE = new DATATYPE_DOUBLE();

        export const STRING = new DATATYPE_STRING();
        export const VECTOR2 = new DATATYPE_VECTOR2();
        export const VECTOR3 = new DATATYPE_VECTOR3();
        export const VECTOR4 = new DATATYPE_VECTOR4();
        export const PYTHON = new DATATYPE_PYTHON();
        // export const PY_DICT = new DATATYPE_PYTHON();
        // export const PY_LIST = new DATATYPE_PYTHON();
        export const UNICODE = new DATATYPE_UNICODE();
        export const ENTITYCALL = new DATATYPE_ENTITYCALL();
        export const ENTITY_COMPONENT = new DATATYPE_ENTITY_COMPONENT();
        export const BLOB = new DATATYPE_BLOB();
    };
}
/*-----------------------------------------------------------------------------------------
                                            KBEngine args
-----------------------------------------------------------------------------------------*/
namespace KBEngine {
    export class KBEngineArgs {
        ip = '127.0.0.1';
        port = 20013;
        updateHZ = 100;
        serverHeartbeatTick = 15;

        isWss: boolean = false;
        //TODO  wss需要参数，因为服务器不支持wss，需要使用Nginx转发一次，在这里设置强制修改baseapp连接端口到Nginx端口
        get protocol(): string { return this.isWss ? "wss://" : "ws://" }
        forceBasePort: number = 0;

        // Reference: http://github.io/docs/programming/clientsdkprogramming.html, client types
        clientType = 5;

        // 在Entity初始化时是否触发属性的set_*事件(callPropertysSetMethods)
        isOnInitCallPropertysSetMethods = true;
    }
    export const EventTypes = {
        // Create new account.
        // <para> param1(string): accountName</para>
        // <para> param2(string): password</para>
        // <para> param3(bytes): datas // Datas by user defined. Data will be recorded into the KBE account database, you can access the datas through the script layer. If you use third-party account system, datas will be submitted to the third-party system.</para>
        createAccount: "createAccount",

        // Login to server.
        // <para> param1(string): accountName</para>
        // <para> param2(string): password</para>
        // <para> param3(bytes): datas // Datas by user defined. Data will be recorded into the KBE account database, you can access the datas through the script layer. If you use third-party account system, datas will be submitted to the third-party system.</para>
        login: "login",

        // Logout to baseapp, called when exiting the client.	
        logout: "logout",

        // Relogin to baseapp.
        reloginBaseapp: "reloginBaseapp",

        // Request server binding account Email.
        // <para> param1(string): emailAddress</para>
        bindAccountEmail: "bindAccountEmail",

        // Request to set up a new password for the account. Note: account must be online.
        // <para> param1(string): old_password</para>
        // <para> param2(string): new_password</para>
        newPassword: "newPassword",

        // ------------------------------------连接相关------------------------------------

        // Kicked of the current server.
        // <para> param1(uint16): retcode. // server_errors</para>
        onKicked: "onKicked",

        // Disconnected from the server.
        onDisconnected: "onDisconnected",

        // Status of connection server.
        // <para> param1(bool): success or fail</para>
        onConnectionState: "onConnectionState",

        // ------------------------------------logon相关------------------------------------

        // Create account feedback results.
        // <para> param1(uint16): retcode. // server_errors</para>
        // <para> param2(bytes): datas. // If you use third-party account system, the system may fill some of the third-party additional datas. </para>
        onCreateAccountResult: "onCreateAccountResult",

        // Engine version mismatch.
        // <para> param1(string): clientVersion
        // <para> param2(string): serverVersion
        onVersionNotMatch: "onVersionNotMatch",

        // script version mismatch.
        // <para> param1(string): clientScriptVersion
        // <para> param2(string): serverScriptVersion
        onScriptVersionNotMatch: "onScriptVersionNotMatch",

        // Login failed.
        // <para> param1(uint16): retcode. // server_errors</para>
        onLoginFailed: "onLoginFailed",

        // Login to baseapp.
        onLoginBaseapp: "onLoginBaseapp",

        // Login baseapp failed.
        // <para> param1(uint16): retcode. // server_errors</para>
        onLoginBaseappFailed: "onLoginBaseappFailed",

        // Relogin to baseapp.
        onReloginBaseapp: "onReloginBaseapp",

        // Relogin baseapp success.
        onReloginBaseappSuccessfully: "onReloginBaseappSuccessfully",

        // Relogin baseapp failed.
        // <para> param1(uint16): retcode. // server_errors</para>
        onReloginBaseappFailed: "onReloginBaseappFailed",

        // ------------------------------------实体cell相关事件------------------------------------

        // Entity enter the client-world.
        // <para> param1: Entity</para>
        onEnterWorld: "onEnterWorld",

        // Entity leave the client-world.
        // <para> param1: Entity</para>
        onLeaveWorld: "onLeaveWorld",

        // Player enter the new space.
        // <para> param1: Entity</para>
        onEnterSpace: "onEnterSpace",

        // Player leave the space.
        // <para> param1: Entity</para>
        onLeaveSpace: "onLeaveSpace",

        // Sets the current position of the entity.
        // <para> param1: Entity</para>
        set_position: "set_position",

        // Sets the current direction of the entity.
        // <para> param1: Entity</para>
        set_direction: "set_direction",

        // The entity position is updated, you can smooth the moving entity to new location.
        // <para> param1: Entity</para>
        updatePosition: "updatePosition",

        // The current space is specified by the geometry mapping.
        // Popular said is to load the specified Map Resources.
        // <para> param1(string): resPath</para>
        addSpaceGeometryMapping: "addSpaceGeometryMapping",

        // Server spaceData set data.
        // <para> param1(int32): spaceID</para>
        // <para> param2(string): key</para>
        // <para> param3(string): value</para>
        onSetSpaceData: "onSetSpaceData",

        // Start downloading data.
        // <para> param1(int32): rspaceID</para>
        // <para> param2(string): key</para>
        onDelSpaceData: "onDelSpaceData",

        // Triggered when the entity is controlled or out of control.
        // <para> param1: Entity</para>
        // <para> param2(bool): isControlled</para>
        onControlled: "onControlled",

        // Lose controlled entity.
        // <para> param1: Entity</para>
        onLoseControlledEntity: "onLoseControlledEntity",

        // ------------------------------------数据下载相关------------------------------------

        // Start downloading data.
        // <para> param1(uint16): resouce id</para>
        // <para> param2(uint32): data size</para>
        // <para> param3(string): description</para>
        onStreamDataStarted: "onStreamDataStarted",

        // Receive data.
        // <para> param1(uint16): resouce id</para>
        // <para> param2(bytes): datas</para>
        onStreamDataRecv: "onStreamDataRecv",

        // The downloaded data is completed.
        // <para> param1(uint16): resouce id</para>
        onStreamDataCompleted: "onStreamDataCompleted",
    }
}
/*-----------------------------------------------------------------------------------------
                                            KBEngine app
-----------------------------------------------------------------------------------------*/
namespace KBEngine {
    export const moduledefs = {};
    export class KBEngineApp {
        constructor(public args: KBEngineArgs) {
            // console.assert(app == null || app == undefined, "Assertion of app not is null");
            app = this;
        }
        baseappIp: string;
        username = "testhtml51";
        password = "123456";
        clientdatas = "";
        encryptedKey = "";

        loginappMessageImported = false;
        baseappMessageImported = false;
        serverErrorsDescrImported = false;
        entitydefImported = false;

        // 这个参数的选择必须与kbengine_defs.xml::cellapp/aliasEntityID的参数保持一致
        useAliasEntityID = true;
        serverErrs: { [err: string]: ServerErr } = {};

        // // 登录loginapp的地址
        // ip: string;
        // port: number;

        // 服务端分配的baseapp地址
        baseappIP = '';
        baseappPort = 0;
        baseappUdpPort = 0;

        currMsgID = 0;
        currMsgCount = 0;
        currMsgLen = 0;

        fragmentStream = null;
        fragmentDatasFlag = FragmentDataTypes.FRAGMENT_DATA_UNKNOW;
        fragmentDatasRemain = 0;

        socket;
        currserver: string;
        currstate = "create";
        currconnect = 'loginapp';

        // 扩展数据
        serverdatas = "";

        // 版本信息
        serverVersion = "";
        serverScriptVersion = "";
        serverProtocolMD5 = "";
        serverEntityDefMD5 = "";
        clientVersion = CLIENT_VERSION;
        clientScriptVersion = CLIENT_SCRIPT_VERSION;

        // player的相关信息
        entity_uuid = null;
        entity_id = 0;
        entity_type = "";

        // 当前玩家最后一次同步到服务端的位置与朝向与服务端最后一次同步过来的位置
        entityServerPos = new Vector3(0.0, 0.0, 0.0);

        // 客户端所有的实体
        entities = {};
        entityIDAliasIDList = [];
        controlledEntities = [];

        // 空间的信息
        spacedata = {};
        spaceID = 0;
        spaceResPath = "";
        isLoadedGeometry = false;

        lastTickTime = Date.now();
        lastTickCBTime = Date.now();
        component;
        msgStream = new MemoryStream(PACKET_MAX_SIZE_TCP);

        resetSocket() {
            try {
                if (app.socket != undefined && app.socket != null) {
                    let sock = app.socket;

                    sock.onopen = undefined;
                    sock.onerror = undefined;
                    sock.onmessage = undefined;
                    sock.onclose = undefined;
                    app.socket = null;
                    sock.close();
                }
            }
            catch (e) {
            }
        }
        reset() {
            if (app.entities != undefined && app.entities != null) {
                app.clearEntities(true);
            }

            app.resetSocket();

            app.currserver = "loginapp";
            app.currstate = "create";
            app.currconnect = 'loginapp'

            // 扩展数据
            app.serverdatas = "";

            // 版本信息
            app.serverVersion = "";
            app.serverScriptVersion = "";
            app.serverProtocolMD5 = "";
            app.serverEntityDefMD5 = "";
            // app.clientVersion = "1.1.5";
            // app.clientScriptVersion = "0.1.0";

            // player的相关信息
            app.entity_uuid = null;
            app.entity_id = 0;
            app.entity_type = "";

            // 当前玩家最后一次同步到服务端的位置与朝向与服务端最后一次同步过来的位置
            app.entityServerPos = new Vector3(0.0, 0.0, 0.0);

            // 客户端所有的实体
            app.entities = {};
            app.entityIDAliasIDList = [];
            app.controlledEntities = [];

            // 空间的信息
            app.spacedata = {};
            app.spaceID = 0;
            app.spaceResPath = "";
            app.isLoadedGeometry = false;

            let dateObject = new Date();
            app.lastTickTime = dateObject.getTime();
            app.lastTickCBTime = dateObject.getTime();

            mappingDataType();

            // 当前组件类别， 配套服务端体系
            app.component = "client";
        }
        installEvents() {
            Event.register(EventTypes.createAccount, app, "createAccount");
            Event.register(EventTypes.login, app, "login");
            Event.register(EventTypes.logout, app, 'logout')
            Event.register(EventTypes.reloginBaseapp, app, "reloginBaseapp");
            Event.register(EventTypes.bindAccountEmail, app, "bindAccountEmail");
            Event.register(EventTypes.newPassword, app, "newPassword");
        }
        uninstallEvents() {
            Event.deregister(EventTypes.createAccount, app);
            Event.deregister(EventTypes.login, app);
            Event.deregister(EventTypes.logout, app)
            Event.deregister(EventTypes.reloginBaseapp, app);
            Event.deregister(EventTypes.bindAccountEmail, app);
            Event.deregister(EventTypes.newPassword, app);
        }
        hello() {
            let bundle = Bundle.createObject();

            if (app.currserver == "loginapp")
                bundle.newMessage(messages['Loginapp_hello']);
            else
                bundle.newMessage(messages['Baseapp_hello']);

            bundle.writeString(app.clientVersion);
            bundle.writeString(app.clientScriptVersion);
            bundle.writeBlob(app.encryptedKey);
            bundle.send(app);
        }
        player() {
            return app.entities[app.entity_id];
        }
        findEntity(entityID) {
            return app.entities[entityID];
        }
        connect(host, port) {
            // console.assert(app.socket == null, "Assertion of socket not is null");
            try {
                let addr = app.args.protocol + host + ':' + port
                //todo  应该是在这里设置wss
                app.socket = new WebSocket(addr);
            }
            catch (e) {
                ERROR_MSG('WebSocket init error!');
                Event.fire(EventTypes.onConnectionState, false);
                return;
            }

            app.socket.binaryType = "arraybuffer";
            app.socket.onopen = app.onopen;
            app.socket.onerror = app.onerror_before_onopen;
            app.socket.onmessage = app.onmessage;
            app.socket.onclose = app.onclose;
        }
        disconnect() {
            app.resetSocket();
        }
        onopen() {
            INFO_MSG('connect success!');
            app.socket.onerror = app.onerror_after_onopen;
            Event.fire(EventTypes.onConnectionState, true);
        }
        onerror_before_onopen(evt) {
            ERROR_MSG('connect error:' + evt.data);
            app.resetSocket();
            Event.fire(EventTypes.onConnectionState, false);
        }
        onerror_after_onopen(evt) {
            ERROR_MSG('connect error:' + evt.data);
            app.resetSocket();
            Event.fire(EventTypes.onDisconnected);
        }
        onmessage(msg) {
            let stream = app.msgStream;
            stream.setbuffer(msg.data);
            stream.wpos = msg.data.byteLength;

            while (stream.length() > 0 || app.fragmentStream != null) {
                if (app.fragmentDatasFlag == FragmentDataTypes.FRAGMENT_DATA_UNKNOW) {
                    if (app.currMsgID == 0) {
                        if (MESSAGE_ID_LENGTH > 1 && stream.length() < MESSAGE_ID_LENGTH) {
                            app.writeFragmentMessage(FragmentDataTypes.FRAGMENT_DATA_MESSAGE_ID, stream, MESSAGE_ID_LENGTH);
                            break;
                        }

                        app.currMsgID = stream.readUint16();
                    }

                    let msgHandler = clientmessages[app.currMsgID];

                    if (!msgHandler) {
                        app.currMsgID = 0;
                        app.currMsgLen = 0;
                        ERROR_MSG("KBEngineApp::onmessage[" + app.currserver + "]: not found msg(" + app.currMsgID + ")!");
                        break;
                    }

                    let msglen = msgHandler.length;
                    if (app.currMsgLen == 0) {
                        if (msglen == -1) {
                            if (stream.length() < MESSAGE_LENGTH_LENGTH) {
                                app.writeFragmentMessage(FragmentDataTypes.FRAGMENT_DATA_MESSAGE_LENGTH, stream, MESSAGE_LENGTH_LENGTH);
                                break;
                            }
                            else {
                                msglen = stream.readUint16();
                                app.currMsgLen = msglen;

                                // 扩展长度
                                if (msglen == MESSAGE_MAX_SIZE) {
                                    if (stream.length() < MESSAGE_LENGTH1_LENGTH) {
                                        app.writeFragmentMessage(FragmentDataTypes.FRAGMENT_DATA_MESSAGE_LENGTH1, stream, MESSAGE_LENGTH1_LENGTH);
                                        break;
                                    }

                                    app.currMsgLen = stream.readUint32();
                                }
                            }
                        }
                        else {
                            app.currMsgLen = msglen;
                        }
                    }

                    if (app.fragmentStream != null && app.fragmentStream.length() >= app.currMsgLen) {
                        msgHandler.handleMessage(app.fragmentStream);
                        app.fragmentStream = null;
                    }
                    else if (stream.length() < app.currMsgLen && stream.length() > 0) {
                        app.writeFragmentMessage(FragmentDataTypes.FRAGMENT_DATA_MESSAGE_BODY, stream, app.currMsgLen);
                        break;
                    }
                    else {
                        let wpos = stream.wpos;
                        let rpos = stream.rpos + msglen;
                        stream.wpos = rpos;
                        msgHandler.handleMessage(stream);
                        stream.wpos = wpos;
                        stream.rpos = rpos;
                    }

                    app.currMsgID = 0;
                    app.currMsgLen = 0;
                    app.fragmentStream = null;
                }
                else {
                    if (app.mergeFragmentMessage(stream))
                        break;
                }
            }
        }
        writeFragmentMessage(FragmentDataType, stream: MemoryStream, datasize) {
            let opsize = stream.length();

            app.fragmentDatasRemain = datasize - opsize;
            app.fragmentDatasFlag = FragmentDataType;
            app.fragmentStream = stream;
        }

        mergeFragmentMessage(stream: MemoryStream) {
            let opsize = stream.length();
            if (opsize == 0)
                return 0;

            let fragmentStream = app.fragmentStream;
            // console.assert(fragmentStream != null);

            if (opsize >= app.fragmentDatasRemain) {
                fragmentStream.append(stream, stream.rpos, app.fragmentDatasRemain);

                switch (app.fragmentDatasFlag) {
                    case FragmentDataTypes.FRAGMENT_DATA_MESSAGE_ID:
                        app.currMsgID = fragmentStream.readUint16();
                        app.fragmentStream = null;
                        break;

                    case FragmentDataTypes.FRAGMENT_DATA_MESSAGE_LENGTH:
                        app.currMsgLen = fragmentStream.readUint16();
                        app.fragmentStream = null;
                        break;

                    case FragmentDataTypes.FRAGMENT_DATA_MESSAGE_LENGTH1:
                        app.currMsgLen = fragmentStream.readUint32();
                        app.fragmentStream = null;
                        break;

                    case FragmentDataTypes.FRAGMENT_DATA_MESSAGE_BODY:
                    default:
                        break;
                }

                stream.rpos += app.fragmentDatasRemain;
                app.fragmentDatasFlag = FragmentDataTypes.FRAGMENT_DATA_UNKNOW;
                app.fragmentDatasRemain = 0;
                return false;
            }
            else {
                fragmentStream.append(stream, stream.rpos, opsize);
                app.fragmentDatasRemain -= opsize;
                stream.done();
                return true;
            }
        }
        onclose() {
            INFO_MSG('connect close:' + app.currserver);

            if (app.currconnect != app.currstate) return;

            app.resetSocket();
            Event.fire(EventTypes.onDisconnected);
            //if(app.currserver != "loginapp")
            //	app.reset();
        }
        send(msg) {
            app.socket.send(msg);
        }
        close() {
            INFO_MSG('KBEngine::close()');
            app.socket.close();
            app.reset();
        }
        update() {
            if (app.socket == null)
                return;

            let dateObject = new Date();
            if ((dateObject.getTime() - app.lastTickTime) / 1000 > app.args.serverHeartbeatTick / 2) {
                // 如果心跳回调接收时间小于心跳发送时间，说明没有收到回调
                // 此时应该通知客户端掉线了
                if (app.lastTickCBTime < app.lastTickTime) {
                    ERROR_MSG("sendTick: Receive appTick timeout!");
                    app.socket.close();
                }

                if (app.currserver == "loginapp") {
                    if (messages['Loginapp_onClientActiveTick'] != undefined) {
                        let bundle = Bundle.createObject();
                        bundle.newMessage(messages['Loginapp_onClientActiveTick']);
                        bundle.send(app);
                    }
                }
                else {
                    if (messages['Baseapp_onClientActiveTick'] != undefined) {
                        let bundle = Bundle.createObject();
                        bundle.newMessage(messages['Baseapp_onClientActiveTick']);
                        bundle.send(app);
                    }
                }

                app.lastTickTime = dateObject.getTime();
            }

            app.updatePlayerToServer();
        }
        Client_onAppActiveTickCB() {
            // let dateObject = new Date();
            app.lastTickCBTime = Date.now() //dateObject.getTime();
        }
        serverErr(id) {
            let e = app.serverErrs[id];

            if (e == undefined) {
                return "";
            }

            return e.name + " [" + e.descr + "]";
        }

        Client_onImportServerErrorsDescr(stream) {
            let size = stream.readUint16();
            while (size > 0) {
                size -= 1;

                let e = new ServerErr();
                e.id = stream.readUint16();
                e.name = utf8ArrayToString(stream.readBlob());
                e.descr = utf8ArrayToString(stream.readBlob());

                app.serverErrs[e.id] = e;

                INFO_MSG("Client_onImportServerErrorsDescr: id=" + e.id + ", name=" + e.name + ", descr=" + e.descr);
            }
        }
        Client_onImportClientSdk(stream: MemoryStream) {
            let remainingFiles = stream.readInt32();
            let fileName = stream.readString();
            let fileSize = stream.readInt32();
            let fileDatas = stream.readBlob()
            Event.fire("onImportClientSDK", remainingFiles, fileName, fileSize, fileDatas);
        }
        onOpenLoginapp_login() {
            INFO_MSG("KBEngineApp::onOpenLoginapp_login: successfully!");
            Event.fire(EventTypes.onConnectionState, true);

            app.currserver = "loginapp";
            app.currstate = "login";

            if (!app.loginappMessageImported) {
                let bundle = Bundle.createObject();
                bundle.newMessage(messages.Loginapp_importClientMessages);
                bundle.send(app);
                app.socket.onmessage = app.Client_onImportClientMessages;
                INFO_MSG("KBEngineApp::onOpenLoginapp_login: start importClientMessages ...");
                Event.fire("Loginapp_importClientMessages");
            }
            else {
                app.onImportClientMessagesCompleted();
            }
        }

        onOpenLoginapp_createAccount() {
            Event.fire("onConnectionState", true);
            INFO_MSG("KBEngineApp::onOpenLoginapp_createAccount: successfully!");
            app.currserver = "loginapp";
            app.currstate = "createAccount";

            if (!app.loginappMessageImported) {
                let bundle = Bundle.createObject();
                bundle.newMessage(messages.Loginapp_importClientMessages);
                bundle.send(app);
                app.socket.onmessage = app.Client_onImportClientMessages;
                INFO_MSG("KBEngineApp::onOpenLoginapp_createAccount: start importClientMessages ...");
                Event.fire("Loginapp_importClientMessages");
            }
            else {
                app.onImportClientMessagesCompleted();
            }
        }
        onImportClientMessagesCompleted() {
            INFO_MSG("KBEngineApp::onImportClientMessagesCompleted: successfully!");
            app.socket.onmessage = app.onmessage;
            app.hello();

            if (app.currserver == "loginapp") {
                if (!app.serverErrorsDescrImported) {
                    INFO_MSG("KBEngine::onImportClientMessagesCompleted(): send importServerErrorsDescr!");
                    app.serverErrorsDescrImported = true;
                    let bundle = Bundle.createObject();
                    bundle.newMessage(messages['Loginapp_importServerErrorsDescr']);
                    bundle.send(app);
                }

                if (app.currstate == "login")
                    app.login_loginapp(false);
                else if (app.currstate == "resetpassword")
                    app.resetpassword_loginapp(false);
                else
                    app.createAccount_loginapp(false);

                app.loginappMessageImported = true;
            }
            else {
                app.baseappMessageImported = true;

                if (!app.entitydefImported) {
                    INFO_MSG("KBEngineApp::onImportClientMessagesCompleted: start importEntityDef ...");
                    let bundle = Bundle.createObject();
                    bundle.newMessage(messages.Baseapp_importClientEntityDef);
                    bundle.send(app);
                    Event.fire("Baseapp_importClientEntityDef");
                }
                else {
                    app.onImportEntityDefCompleted();
                }
            }
        }
        createDataTypeFromStreams(stream, canprint) {
            let aliassize = stream.readUint16();
            INFO_MSG("KBEngineApp::createDataTypeFromStreams: importAlias(size=" + aliassize + ")!");

            while (aliassize > 0) {
                aliassize--;
                app.createDataTypeFromStream(stream, canprint);
            };

            for (let datatype in datatypes) {
                if (datatypes[datatype] != undefined) {
                    datatypes[datatype].bind();
                }
            }
        }
        createDataTypeFromStream(stream, canprint) {
            let utype = stream.readUint16();
            let name = stream.readString();
            let valname = stream.readString();
            let length: string;
            /* 有一些匿名类型，我们需要提供一个唯一名称放到datatypes中
                如：
                <onRemoveAvatar>
                    <Arg>	ARRAY <of> INT8 </of>		</Arg>
                </onRemoveAvatar>				
            */
            if (valname.length == 0)
                length = "Null_" + utype;

            if (canprint)
                INFO_MSG("KBEngineApp::Client_onImportClientEntityDef: importAlias(" + name + ":" + valname + ")!");

            if (name == "FIXED_DICT") {
                let datatype = new DATATYPE_FIXED_DICT();
                let keysize = stream.readUint8();
                datatype.implementedBy = stream.readString();

                while (keysize > 0) {
                    keysize--;

                    let keyname = stream.readString();
                    let keyutype = stream.readUint16();
                    datatype.dicttype[keyname] = keyutype;
                };

                datatypes[valname] = datatype;
            }
            else if (name == "ARRAY") {
                let uitemtype = stream.readUint16();
                let datatype = new DATATYPE_ARRAY();
                datatype.type = uitemtype;
                datatypes[valname] = datatype;
            }
            else {
                datatypes[valname] = datatypes[name];
            }

            datatypes[utype] = datatypes[valname];

            // 将用户自定义的类型补充到映射表中
            datatype2id[valname] = utype;
        }
        Client_onImportClientEntityDef(stream) {
            app.createDataTypeFromStreams(stream, true);

            while (stream.length() > 0) {
                let scriptmodule_name = stream.readString();
                let scriptUtype = stream.readUint16();
                let propertysize = stream.readUint16();
                let methodsize = stream.readUint16();
                let base_methodsize = stream.readUint16();
                let cell_methodsize = stream.readUint16();

                INFO_MSG("KBEngineApp::Client_onImportClientEntityDef: import(" + scriptmodule_name + "), propertys(" + propertysize + "), " +
                    "clientMethods(" + methodsize + "), baseMethods(" + base_methodsize + "), cellMethods(" + cell_methodsize + ")!");

                moduledefs[scriptmodule_name] = {};
                let currModuleDefs = moduledefs[scriptmodule_name];
                currModuleDefs["name"] = scriptmodule_name;
                currModuleDefs["propertys"] = {};
                currModuleDefs["methods"] = {};
                currModuleDefs["base_methods"] = {};
                currModuleDefs["cell_methods"] = {};
                moduledefs[scriptUtype] = currModuleDefs;

                let self_propertys = currModuleDefs["propertys"];
                let self_methods = currModuleDefs["methods"];
                let self_base_methods = currModuleDefs["base_methods"];
                let self_cell_methods = currModuleDefs["cell_methods"];

                let Class = KBEngine['Entities'][scriptmodule_name];

                while (propertysize > 0) {
                    propertysize--;

                    let properUtype = stream.readUint16();
                    let properFlags = stream.readUint32();
                    let aliasID = stream.readInt16();
                    let name = stream.readString();
                    let defaultValStr = stream.readString();
                    let utype = datatypes[stream.readUint16()];
                    let setmethod = null;

                    if (Class != undefined) {
                        setmethod = Class.prototype["set_" + name];
                        if (setmethod == undefined)
                            setmethod = null;
                    }

                    let savedata = [properUtype, aliasID, name, defaultValStr, utype, setmethod, properFlags];
                    self_propertys[name] = savedata;

                    if (aliasID != -1) {
                        self_propertys[aliasID] = savedata;
                        currModuleDefs["usePropertyDescrAlias"] = true;
                    }
                    else {
                        self_propertys[properUtype] = savedata;
                        currModuleDefs["usePropertyDescrAlias"] = false;
                    }

                    INFO_MSG("KBEngineApp::Client_onImportClientEntityDef: add(" + scriptmodule_name + "), property(" + name + "/" + properUtype + ").");
                };

                while (methodsize > 0) {
                    methodsize--;

                    let methodUtype = stream.readUint16();
                    let aliasID = stream.readInt16();
                    let name = stream.readString();
                    let argssize = stream.readUint8();
                    let args = [];

                    while (argssize > 0) {
                        argssize--;
                        args.push(datatypes[stream.readUint16()]);
                    };

                    let savedata = [methodUtype, aliasID, name, args];
                    self_methods[name] = savedata;

                    if (aliasID != -1) {
                        self_methods[aliasID] = savedata;
                        currModuleDefs["useMethodDescrAlias"] = true;
                    }
                    else {
                        self_methods[methodUtype] = savedata;
                        currModuleDefs["useMethodDescrAlias"] = false;
                    }

                    INFO_MSG("KBEngineApp::Client_onImportClientEntityDef: add(" + scriptmodule_name + "), method(" + name + ").");
                };

                while (base_methodsize > 0) {
                    base_methodsize--;

                    let methodUtype = stream.readUint16();
                    let aliasID = stream.readInt16();
                    let name = stream.readString();
                    let argssize = stream.readUint8();
                    let args = [];

                    while (argssize > 0) {
                        argssize--;
                        args.push(datatypes[stream.readUint16()]);
                    };

                    self_base_methods[name] = [methodUtype, aliasID, name, args];
                    INFO_MSG("KBEngineApp::Client_onImportClientEntityDef: add(" + scriptmodule_name + "), base_method(" + name + ").");
                };

                while (cell_methodsize > 0) {
                    cell_methodsize--;

                    let methodUtype = stream.readUint16();
                    let aliasID = stream.readInt16();
                    let name = stream.readString();
                    let argssize = stream.readUint8();
                    let args = [];

                    while (argssize > 0) {
                        argssize--;
                        args.push(datatypes[stream.readUint16()]);
                    };

                    self_cell_methods[name] = [methodUtype, aliasID, name, args];
                    INFO_MSG("KBEngineApp::Client_onImportClientEntityDef: add(" + scriptmodule_name + "), cell_method(" + name + ").");
                };
                let defmethod
                try {
                    defmethod = KBEngine['Entities'][scriptmodule_name];
                }
                catch (e) {
                    ERROR_MSG("KBEngineApp::Client_onImportClientEntityDef: module(" + scriptmodule_name + ") not found!");
                    defmethod = undefined;
                }

                for (let name in currModuleDefs.propertys) {
                    let infos = currModuleDefs.propertys[name];
                    let properUtype = infos[0];
                    let aliasID = infos[1];
                    let n = infos[2];
                    let defaultValStr = infos[3];
                    let utype = infos[4];

                    if (defmethod != undefined)
                        defmethod.prototype[n] = utype.parseDefaultValStr(defaultValStr);
                };

                for (let name in currModuleDefs.methods) {
                    let infos = currModuleDefs.methods[name];
                    let properUtype = infos[0];
                    let aliasID = infos[1];
                    let n = infos[2];
                    let args = infos[3];

                    if (defmethod != undefined && defmethod.prototype[n] == undefined) {
                        WARNING_MSG(scriptmodule_name + ":: method(" + n + ") no implement!");
                    }
                };
            }

            app.onImportEntityDefCompleted();
        }
        Client_onVersionNotMatch(stream) {
            app.serverVersion = stream.readString();
            ERROR_MSG("Client_onVersionNotMatch: verInfo=" + app.clientVersion + " not match(server: " + app.serverVersion + ")");
            Event.fire(EventTypes.onVersionNotMatch, app.clientVersion, app.serverVersion);
        }
        Client_onScriptVersionNotMatch(stream) {
            app.serverScriptVersion = stream.readString();
            ERROR_MSG("Client_onScriptVersionNotMatch: verInfo=" + app.clientScriptVersion + " not match(server: " + app.serverScriptVersion + ")");
            Event.fire(EventTypes.onScriptVersionNotMatch, app.clientScriptVersion, app.serverScriptVersion);
        }
        onImportEntityDefCompleted() {
            INFO_MSG("KBEngineApp::onImportEntityDefCompleted: successfully!");
            app.entitydefImported = true;
            app.login_baseapp(false);
        }
        importClientMessages(stream) {
            while (app.currMsgCount > 0) {
                app.currMsgCount--;

                let msgid = stream.readUint16();
                let msglen = stream.readInt16();
                let msgname = stream.readString();
                let argtype = stream.readInt8();
                let argsize = stream.readUint8();
                let argstypes = new Array(argsize);

                for (let i = 0; i < argsize; i++) {
                    argstypes[i] = stream.readUint8();
                }

                let handler = null;
                let isClientMethod = msgname.indexOf("Client_") >= 0;
                if (isClientMethod) {
                    handler = app[msgname];
                    if (handler == null || handler == undefined) {
                        WARNING_MSG("KBEngineApp::onImportClientMessages[" + app.currserver + "]: interface(" + msgname + "/" + msgid + ") no implement!");
                        handler = null;
                    }
                    else {
                        INFO_MSG("KBEngineApp::onImportClientMessages: import(" + msgname + ") successfully!");
                    }
                }

                if (msgname.length > 0) {
                    messages[msgname] = new Message(msgid, msgname, msglen, argtype, argstypes, handler);

                    if (isClientMethod)
                        clientmessages[msgid] = messages[msgname];
                    else
                        messages[app.currserver][msgid] = messages[msgname];
                }
                else {
                    messages[app.currserver][msgid] = new Message(msgid, msgname, msglen, argtype, argstypes, handler);
                }
            };

            app.onImportClientMessagesCompleted();
            app.currMsgID = 0;
            app.currMsgLen = 0;
            app.currMsgCount = 0;
            app.fragmentStream = null;
        }

        Client_onImportClientMessages(msg) {
            let stream = new MemoryStream(msg.data);
            stream.wpos = msg.data.byteLength;

            if (app.currMsgID == 0) {
                app.currMsgID = stream.readUint16();
            }

            if (app.currMsgID == messages.onImportClientMessages.id) {
                if (app.currMsgLen == 0) {
                    app.currMsgLen = stream.readUint16();
                    app.currMsgCount = stream.readUint16();
                }

                if (stream.length() + 2 < app.currMsgLen && app.fragmentStream == null) {
                    app.writeFragmentMessage(FragmentDataTypes.FRAGMENT_DATA_MESSAGE_BODY, stream, app.currMsgLen - 2);
                }
                else if (app.fragmentStream != null) {
                    app.mergeFragmentMessage(stream);

                    if (app.fragmentStream.length() + 2 >= app.currMsgLen) {
                        app.importClientMessages(app.fragmentStream);
                    }
                }
                else {
                    app.importClientMessages(stream);
                }
            }
            else {
                ERROR_MSG("KBEngineApp::onmessage: not found msg(" + app.currMsgID + ")!");
            }
        }
        createAccount(username, password, datas) {
            app.reset();
            app.username = username;
            app.password = password;
            app.clientdatas = datas;

            app.createAccount_loginapp(true);
        }
        createAccount_loginapp(noconnect) {
            if (noconnect) {
                INFO_MSG("KBEngineApp::createAccount_loginapp: start connect to ws://" + app.args.ip + ":" + app.args.port + "!");
                app.currconnect = "loginapp";
                app.connect(app.args.ip, app.args.port);
                app.socket.onopen = app.onOpenLoginapp_createAccount;
            }
            else {
                let bundle = Bundle.createObject();
                bundle.newMessage(messages['Loginapp_reqCreateAccount']);
                bundle.writeString(app.username);
                bundle.writeString(app.password);
                bundle.writeBlob(app.clientdatas);
                bundle.send(app);
            }
        }
        bindAccountEmail(emailAddress) {
            let bundle = Bundle.createObject();
            bundle.newMessage(messages['Baseapp_reqAccountBindEmail']);
            bundle.writeInt32(app.entity_id);
            bundle.writeString(app.password);
            bundle.writeString(emailAddress);
            bundle.send(app);
        }
        newPassword(old_password, new_password) {
            let bundle = Bundle.createObject();
            bundle.newMessage(messages['Baseapp_reqAccountNewPassword']);
            bundle.writeInt32(app.entity_id);
            bundle.writeString(old_password);
            bundle.writeString(new_password);
            bundle.send(app);
        }
        logout() {
            let bundle = new Bundle();
            bundle.newMessage(messages['Baseapp_logoutBaseapp']);
            bundle.writeUint64(app.entity_uuid);
            bundle.writeInt32(app.entity_id);
            bundle.send(app);
        }
        login(username, password, datas) {
            app.reset();
            app.username = username;
            app.password = password;
            app.clientdatas = datas;

            app.login_loginapp(true);
        }
        login_loginapp(noconnect) {
            if (noconnect) {
                INFO_MSG("KBEngineApp::login_loginapp: start connect to ws://" + app.args.ip + ":" + app.args.port + "!");
                app.currconnect = "loginapp";
                app.connect(app.args.ip, app.args.port);
                app.socket.onopen = app.onOpenLoginapp_login;
            }
            else {
                let bundle = Bundle.createObject();
                bundle.newMessage(messages['Loginapp_login']);
                bundle.writeInt8(app.args.clientType); // clientType
                bundle.writeBlob(app.clientdatas);
                bundle.writeString(app.username);
                bundle.writeString(app.password);
                bundle.send(app);
            }
        }
        onOpenLoginapp_resetpassword() {
            INFO_MSG("KBEngineApp::onOpenLoginapp_resetpassword: successfully!");
            app.currserver = "loginapp";
            app.currstate = "resetpassword";

            if (!app.loginappMessageImported) {
                let bundle = Bundle.createObject();
                bundle.newMessage(messages.Loginapp_importClientMessages);
                bundle.send(app);
                app.socket.onmessage = app.Client_onImportClientMessages;
                INFO_MSG("KBEngineApp::onOpenLoginapp_resetpassword: start importClientMessages ...");
            }
            else {
                app.onImportClientMessagesCompleted();
            }
        }
        reset_password(username) {
            app.reset();
            app.username = username;
            app.resetpassword_loginapp(true);
        }
        resetpassword_loginapp(noconnect) {
            if (noconnect) {
                INFO_MSG("KBEngineApp::createAccount_loginapp: start connect to ws://" + app.args.ip + ":" + app.args.port + "!");
                app.currconnect = "loginapp";
                app.connect(app.args.ip, app.args.port);
                app.socket.onopen = app.onOpenLoginapp_resetpassword;
            }
            else {
                let bundle = Bundle.createObject();
                bundle.newMessage(messages['Loginapp_reqAccountResetPassword']);
                bundle.writeString(app.username);
                bundle.send(app);
            }
        }
        onOpenBaseapp() {
            INFO_MSG("KBEngineApp::onOpenBaseapp: successfully!");
            app.currserver = "baseapp";

            if (!app.baseappMessageImported) {
                let bundle = Bundle.createObject();
                bundle.newMessage(messages.Baseapp_importClientMessages);
                bundle.send(app);
                app.socket.onmessage = app.Client_onImportClientMessages;
                Event.fire("Baseapp_importClientMessages");
            }
            else {
                app.onImportClientMessagesCompleted();
            }
        }

        login_baseapp(noconnect) {
            if (noconnect) {
                Event.fire("onLoginBaseapp");
                INFO_MSG("KBEngineApp::login_baseapp: start connect to ws://" + app.baseappIp + ":" + app.baseappPort + "!");
                app.currconnect = "baseapp";
                app.connect(app.baseappIp, app.baseappPort);

                if (app.socket != undefined && app.socket != null)
                    app.socket.onopen = app.onOpenBaseapp;
            }
            else {
                let bundle = Bundle.createObject();
                bundle.newMessage(messages['Baseapp_loginBaseapp']);
                bundle.writeString(app.username);
                bundle.writeString(app.password);
                bundle.send(app);
            }
        }
        reloginBaseapp() {
            app.lastTickCBTime = app.lastTickTime = Date.now();

            if (app.socket != undefined && app.socket != null)
                return;

            app.resetSocket();
            Event.fire(EventTypes.onReloginBaseapp);

            INFO_MSG("KBEngineApp::reloginBaseapp: start connect to ws://" + app.baseappIp + ":" + app.baseappPort + "!");
            app.currconnect = "baseapp";
            app.connect(app.baseappIp, app.baseappPort);

            if (app.socket != undefined && app.socket != null)
                app.socket.onopen = app.onReOpenBaseapp;
        }
        onReOpenBaseapp() {
            INFO_MSG("KBEngineApp::onReOpenBaseapp: successfully!");
            app.currserver = "baseapp";

            let bundle = Bundle.createObject();
            bundle.newMessage(messages['Baseapp_reloginBaseapp']);
            bundle.writeString(app.username);
            bundle.writeString(app.password);
            bundle.writeUint64(app.entity_uuid);
            bundle.writeInt32(app.entity_id);
            bundle.send(app);

            let dateObject = new Date();
            app.lastTickCBTime = dateObject.getTime();
        }
        Client_onHelloCB(args) {
            app.serverVersion = args.readString();
            app.serverScriptVersion = args.readString();
            app.serverProtocolMD5 = args.readString();
            app.serverEntityDefMD5 = args.readString();

            let ctype = args.readInt32();

            INFO_MSG("KBEngineApp::Client_onHelloCB: verInfo(" + app.serverVersion + "), scriptVerInfo(" +
                app.serverScriptVersion + "), serverProtocolMD5(" + app.serverProtocolMD5 + "), serverEntityDefMD5(" +
                app.serverEntityDefMD5 + "), ctype(" + ctype + ")!");

            let dateObject = new Date();
            app.lastTickCBTime = dateObject.getTime();
        }
        Client_onLoginFailed(args) {
            let failedcode = args.readUint16();
            app.serverdatas = args.readBlob();
            ERROR_MSG("KBEngineApp::Client_onLoginFailed: failedcode(" + app.serverErrs[failedcode].name + "), datas(" + app.serverdatas.length + ")!");
            Event.fire("onLoginFailed", failedcode);
        }
        Client_onLoginSuccessfully(args) {
            let accountName = args.readString();
            app.username = accountName;
            app.baseappIp = args.readString();
            app.baseappPort = args.readUint16();
            app.baseappUdpPort = args.readUint16();
            app.serverdatas = args.readBlob();

            INFO_MSG("KBEngineApp::Client_onLoginSuccessfully: accountName(" + accountName + "), addr(" +
                app.baseappIp + ":" + app.baseappPort + "), datas(" + app.serverdatas.length + ")!");

            app.disconnect();
            app.login_baseapp(true);
        }
        Client_onLoginBaseappFailed(failedcode) {
            ERROR_MSG("KBEngineApp::Client_onLoginBaseappFailed: failedcode(" + app.serverErrs[failedcode].name + ")!");
            Event.fire(EventTypes.onLoginBaseappFailed, failedcode);
        }
        Client_onReloginBaseappFailed(failedcode) {
            ERROR_MSG("KBEngineApp::Client_onReloginBaseappFailed: failedcode(" + app.serverErrs[failedcode].name + ")!");
            Event.fire(EventTypes.onReloginBaseappFailed, failedcode);
        }
        Client_onReloginBaseappSuccessfully(stream) {
            app.entity_uuid = stream.readUint64();
            DEBUG_MSG("KBEngineApp::Client_onReloginBaseappSuccessfully: " + app.username);
            Event.fire(EventTypes.onReloginBaseappSuccessfully);
        }
        entityclass = {};
        getentityclass(entityType) {
            let runclass = KBEngine['Entities'][entityType];
            if (runclass == undefined) {
                ERROR_MSG("KBEngineApp::getentityclass: entityType(" + entityType + ") is error!");
                return runclass;
            }

            return runclass;
        }
        Client_onCreatedProxies(rndUUID, eid, entityType) {
            INFO_MSG("KBEngineApp::Client_onCreatedProxies: eid(" + eid + "), entityType(" + entityType + ")!");

            let entity = app.entities[eid];

            app.entity_uuid = rndUUID;
            app.entity_id = eid;

            if (entity == undefined) {
                let runclass = app.getentityclass(entityType);
                if (runclass == undefined)
                    return;

                let entity = new runclass();
                entity.id = eid;
                entity.className = entityType;

                entity.base = new EntityCall();
                entity.base.id = eid;
                entity.base.className = entityType;
                entity.base.type = ENTITYCALL_TYPE_BASE;

                app.entities[eid] = entity;

                let entityMessage = bufferedCreateEntityMessages[eid];
                if (entityMessage != undefined) {
                    app.Client_onUpdatePropertys(entityMessage);
                    delete bufferedCreateEntityMessages[eid];
                }

                entity.__init__();
                entity.inited = true;

                if (app.args.isOnInitCallPropertysSetMethods)
                    entity.callPropertysSetMethods();
            }
            else {
                let entityMessage = bufferedCreateEntityMessages[eid];
                if (entityMessage != undefined) {
                    app.Client_onUpdatePropertys(entityMessage);
                    delete bufferedCreateEntityMessages[eid];
                }
            }
        }
        getViewEntityIDFromStream(stream) {
            let id = 0;
            if (app.entityIDAliasIDList.length > 255) {
                id = stream.readInt32();
            }
            else {
                let aliasID = stream.readUint8();

                // 如果为0且客户端上一步是重登陆或者重连操作并且服务端entity在断线期间一直处于在线状态
                // 则可以忽略这个错误, 因为cellapp可能一直在向baseapp发送同步消息， 当客户端重连上时未等
                // 服务端初始化步骤开始则收到同步信息, 此时这里就会出错。
                if (app.entityIDAliasIDList.length <= aliasID)
                    return 0;

                id = app.entityIDAliasIDList[aliasID];
            }

            return id;
        }
        onUpdatePropertys_(eid, stream) {
            let entity = app.entities[eid];

            if (entity == undefined) {
                let entityMessage = bufferedCreateEntityMessages[eid];
                if (entityMessage != undefined) {
                    ERROR_MSG("KBEngineApp::Client_onUpdatePropertys: entity(" + eid + ") not found!");
                    return;
                }

                let stream1 = new MemoryStream(stream.buffer);
                stream1.wpos = stream.wpos;
                stream1.rpos = stream.rpos - 4;
                bufferedCreateEntityMessages[eid] = stream1;
                return;
            }

            let currModule = moduledefs[entity.className];
            let pdatas = currModule.propertys;
            while (stream.length() > 0) {
                let utype = 0;
                if (currModule.usePropertyDescrAlias)
                    utype = stream.readUint8();
                else
                    utype = stream.readUint16();

                let propertydata = pdatas[utype];
                let setmethod = propertydata[5];
                let flags = propertydata[6];
                let val = propertydata[4].createFromStream(stream);
                let oldval = entity[propertydata[2]];

                INFO_MSG("KBEngineApp::Client_onUpdatePropertys: " + entity.className + "(id=" + eid + " " + propertydata[2] + ", val=" + val + ")!");

                entity[propertydata[2]] = val;
                if (setmethod != null) {
                    // base类属性或者进入世界后cell类属性会触发set_*方法
                    if (flags == 0x00000020 || flags == 0x00000040) {
                        if (entity.inited)
                            setmethod.call(entity, oldval);
                    }
                    else {
                        if (entity.inWorld)
                            setmethod.call(entity, oldval);
                    }
                }
            }
        }
        Client_onUpdatePropertysOptimized(stream) {
            let eid = app.getViewEntityIDFromStream(stream);
            app.onUpdatePropertys_(eid, stream);
        }
        Client_onUpdatePropertys(stream) {
            let eid = stream.readInt32();
            app.onUpdatePropertys_(eid, stream);
        }
        onRemoteMethodCall_(eid, stream) {
            let entity = app.entities[eid];

            if (entity == undefined) {
                ERROR_MSG("KBEngineApp::Client_onRemoteMethodCall: entity(" + eid + ") not found!");
                return;
            }

            let methodUtype = 0;
            if (moduledefs[entity.className].useMethodDescrAlias)
                methodUtype = stream.readUint8();
            else
                methodUtype = stream.readUint16();

            let methoddata = moduledefs[entity.className].methods[methodUtype];
            let args = [];
            let argsdata = methoddata[3];
            for (let i = 0; i < argsdata.length; i++) {
                args.push(argsdata[i].createFromStream(stream));
            }

            if (entity[methoddata[2]] != undefined) {
                entity[methoddata[2]].apply(entity, args);
            }
            else {
                ERROR_MSG("KBEngineApp::Client_onRemoteMethodCall: entity(" + eid + ") not found method(" + methoddata[2] + ")!");
            }
        }
        Client_onRemoteMethodCallOptimized(stream) {
            let eid = app.getViewEntityIDFromStream(stream);
            app.onRemoteMethodCall_(eid, stream);
        }
        Client_onRemoteMethodCall(stream) {
            let eid = stream.readInt32();
            app.onRemoteMethodCall_(eid, stream);
        }
        Client_onEntityEnterWorld(stream) {
            let eid = stream.readInt32();
            if (app.entity_id > 0 && eid != app.entity_id)
                app.entityIDAliasIDList.push(eid)

            let entityType;
            if (moduledefs['Length'] > 255)
                entityType = stream.readUint16();
            else
                entityType = stream.readUint8();

            let isOnGround = true;

            if (stream.length() > 0)
                isOnGround = stream.readInt8();

            entityType = moduledefs[entityType].name;
            INFO_MSG("KBEngineApp::Client_onEntityEnterWorld: " + entityType + "(" + eid + "), spaceID(" + app.spaceID + "), isOnGround(" + isOnGround + ")!");

            let entity = app.entities[eid];
            if (entity == undefined) {
                let entityMessage = bufferedCreateEntityMessages[eid];
                if (entityMessage == undefined) {
                    ERROR_MSG("KBEngineApp::Client_onEntityEnterWorld: entity(" + eid + ") not found!");
                    return;
                }

                let runclass = app.getentityclass(entityType);
                if (runclass == undefined)
                    return;

                let entity = new runclass();
                entity.id = eid;
                entity.className = entityType;

                entity.cell = new EntityCall();
                entity.cell.id = eid;
                entity.cell.className = entityType;
                entity.cell.type = ENTITYCALL_TYPE_CELL;

                app.entities[eid] = entity;

                app.Client_onUpdatePropertys(entityMessage);
                delete bufferedCreateEntityMessages[eid];

                // entity.isOnGround = isOnGround > 0;
                entity.isOnGround = isOnGround;
                entity.__init__();
                entity.inited = true;
                entity.inWorld = true;
                entity.enterWorld();

                if (app.args.isOnInitCallPropertysSetMethods)
                    entity.callPropertysSetMethods();

                entity.set_direction(entity.direction);
                entity.set_position(entity.position);
            }
            else {
                if (!entity.inWorld) {
                    entity.cell = new EntityCall();
                    entity.cell.id = eid;
                    entity.cell.className = entityType;
                    entity.cell.type = ENTITYCALL_TYPE_CELL;

                    // 安全起见， 这里清空一下
                    // 如果服务端上使用giveClientTo切换控制权
                    // 之前的实体已经进入世界， 切换后的实体也进入世界， 这里可能会残留之前那个实体进入世界的信息
                    app.entityIDAliasIDList = [];
                    app.entities = {}
                    app.entities[entity.id] = entity;

                    entity.set_direction(entity.direction);
                    entity.set_position(entity.position);

                    app.entityServerPos.x = entity.position.x;
                    app.entityServerPos.y = entity.position.y;
                    app.entityServerPos.z = entity.position.z;

                    entity.isOnGround = isOnGround;
                    // entity.isOnGround = isOnGround > 0;

                    entity.inWorld = true;
                    entity.enterWorld();

                    if (app.args.isOnInitCallPropertysSetMethods)
                        entity.callPropertysSetMethods();
                }
            }
        }
        Client_onEntityLeaveWorldOptimized(stream) {
            let eid = app.getViewEntityIDFromStream(stream);
            app.Client_onEntityLeaveWorld(eid);
        }
        Client_onEntityLeaveWorld(eid) {
            let entity = app.entities[eid];
            if (entity == undefined) {
                ERROR_MSG("KBEngineApp::Client_onEntityLeaveWorld: entity(" + eid + ") not found!");
                return;
            }

            if (entity.inWorld)
                entity.leaveWorld();

            if (app.entity_id > 0 && eid != app.entity_id) {
                let newArray0 = [];

                for (let i = 0; i < app.controlledEntities.length; i++) {
                    if (app.controlledEntities[i] != eid) {
                        newArray0.push(app.controlledEntities[i]);
                    }
                    else {
                        Event.fire("onLoseControlledEntity");
                    }
                }

                app.controlledEntities = newArray0

                delete app.entities[eid];

                let newArray = [];
                for (let i = 0; i < app.entityIDAliasIDList.length; i++) {
                    if (app.entityIDAliasIDList[i] != eid) {
                        newArray.push(app.entityIDAliasIDList[i]);
                    }
                }

                app.entityIDAliasIDList = newArray
            }
            else {
                app.clearSpace(false);
                entity.cell = null;
            }
        }
        Client_onEntityDestroyed(eid) {
            INFO_MSG("KBEngineApp::Client_onEntityDestroyed: entity(" + eid + ")!");

            let entity = app.entities[eid];
            if (entity == undefined) {
                ERROR_MSG("KBEngineApp::Client_onEntityDestroyed: entity(" + eid + ") not found!");
                return;
            }

            if (entity.inWorld) {
                if (app.entity_id == eid)
                    app.clearSpace(false);

                entity.leaveWorld();
            }

            delete app.entities[eid];
        }
        Client_onEntityEnterSpace(stream) {
            let eid = stream.readInt32();
            app.spaceID = stream.readUint32();
            let isOnGround = true;

            if (stream.length() > 0)
                isOnGround = stream.readInt8();

            let entity = app.entities[eid];
            if (entity == undefined) {
                ERROR_MSG("KBEngineApp::Client_onEntityEnterSpace: entity(" + eid + ") not found!");
                return;
            }

            entity.isOnGround = isOnGround;
            app.entityServerPos.x = entity.position.x;
            app.entityServerPos.y = entity.position.y;
            app.entityServerPos.z = entity.position.z;
            entity.enterSpace();
        }
        Client_onEntityLeaveSpace(eid) {
            let entity = app.entities[eid];
            if (entity == undefined) {
                ERROR_MSG("KBEngineApp::Client_onEntityLeaveSpace: entity(" + eid + ") not found!");
                return;
            }

            app.clearSpace(false);
            entity.leaveSpace();
        }
        Client_onKicked(failedcode) {
            ERROR_MSG("KBEngineApp::Client_onKicked: failedcode(" + app.serverErrs[failedcode].name + ")!");
            Event.fire(EventTypes.onKicked, failedcode);
        }
        Client_onCreateAccountResult(stream) {
            let retcode = stream.readUint16();
            let datas = stream.readBlob();

            Event.fire("onCreateAccountResult", retcode, datas);

            if (retcode != 0) {
                ERROR_MSG("KBEngineApp::Client_onCreateAccountResult: " + app.username + " create is failed! code=" + app.serverErrs[retcode].name + "!");
                return;
            }

            INFO_MSG("KBEngineApp::Client_onCreateAccountResult: " + app.username + " create is successfully!");
        }
        Client_onControlEntity(eid, isControlled) {
            // eid = stream.readInt32();
            let entity = app.entities[eid];
            if (entity == undefined) {
                ERROR_MSG("KBEngineApp::Client_onControlEntity: entity(" + eid + ") not found!");
                return;
            }

            let isCont = isControlled != 0;
            if (isCont) {
                // 如果被控制者是玩家自己，那表示玩家自己被其它人控制了
                // 所以玩家自己不应该进入这个被控制列表
                if (app.player().id != entity.id) {
                    app.controlledEntities.push(entity)
                }
            }
            else {
                let newArray = [];

                for (let i = 0; i < app.controlledEntities.length; i++)
                    if (app.controlledEntities[i] != entity.id)
                        newArray.push(app.controlledEntities[i]);

                app.controlledEntities = newArray
            }

            entity.isControlled = isCont;

            try {
                entity.onControlled(isCont);
                Event.fire(EventTypes.onControlled, entity, isCont);
            }
            catch (e) {
                ERROR_MSG("KBEngine::Client_onControlEntity: entity id = '" + eid + "', is controlled = '" + isCont + "', error = '" + e + "'");
            }
        }
        updatePlayerToServer() {
            let player = app.player();
            if (player == undefined || player.inWorld == false || app.spaceID == 0 || player.isControlled)
                return;

            if (player.entityLastLocalPos.distance(player.position) > 0.001 || player.entityLastLocalDir.distance(player.direction) > 0.001) {
                // 记录玩家最后一次上报位置时自身当前的位置
                player.entityLastLocalPos.x = player.position.x;
                player.entityLastLocalPos.y = player.position.y;
                player.entityLastLocalPos.z = player.position.z;
                player.entityLastLocalDir.x = player.direction.x;
                player.entityLastLocalDir.y = player.direction.y;
                player.entityLastLocalDir.z = player.direction.z;

                let bundle = Bundle.createObject();
                bundle.newMessage(messages['Baseapp_onUpdateDataFromClient']);
                bundle.writeFloat(player.position.x);
                bundle.writeFloat(player.position.y);
                bundle.writeFloat(player.position.z);
                bundle.writeFloat(player.direction.x);
                bundle.writeFloat(player.direction.y);
                bundle.writeFloat(player.direction.z);
                bundle.writeUint8(player.isOnGround);
                bundle.writeUint32(app.spaceID);
                bundle.send(app);
            }

            // 开始同步所有被控制了的entity的位置
            for (let i in app.controlledEntities) {
                let entity = app.controlledEntities[i];
                let position = entity.position;
                let direction = entity.direction;

                let posHasChanged = entity.entityLastLocalPos.distance(position) > 0.001;
                let dirHasChanged = entity.entityLastLocalDir.distance(direction) > 0.001;

                if (posHasChanged || dirHasChanged) {
                    entity.entityLastLocalPos = position;
                    entity.entityLastLocalDir = direction;

                    let bundle = Bundle.createObject();
                    bundle.newMessage(messages['Baseapp_onUpdateDataFromClientForControlledEntity']);
                    bundle.writeInt32(entity.id);
                    bundle.writeFloat(position.x);
                    bundle.writeFloat(position.y);
                    bundle.writeFloat(position.z);

                    bundle.writeFloat(direction.x);
                    bundle.writeFloat(direction.y);
                    bundle.writeFloat(direction.z);
                    bundle.writeUint8(entity.isOnGround);
                    bundle.writeUint32(app.spaceID);
                    bundle.send(app);
                }
            }
        }
        addSpaceGeometryMapping(spaceID, respath) {
            INFO_MSG("KBEngineApp::addSpaceGeometryMapping: spaceID(" + spaceID + "), respath(" + respath + ")!");

            app.spaceID = spaceID;
            app.spaceResPath = respath;
            Event.fire(EventTypes.addSpaceGeometryMapping, respath);
        }
        clearSpace(isAll) {
            app.entityIDAliasIDList = [];
            app.spacedata = {};
            app.clearEntities(isAll);
            app.isLoadedGeometry = false;
            app.spaceID = 0;
        }
        clearEntities(isAll) {
            app.controlledEntities = []

            if (!isAll) {
                let entity = app.player();

                for (let eid in app.entities) {
                    if (eid == entity.id)
                        continue;

                    if (app.entities[eid].inWorld) {
                        app.entities[eid].leaveWorld();
                    }

                    app.entities[eid].onDestroy();
                }

                app.entities = {}
                app.entities[entity.id] = entity;
            }
            else {
                for (let eid in app.entities) {
                    if (app.entities[eid].inWorld) {
                        app.entities[eid].leaveWorld();
                    }

                    app.entities[eid].onDestroy();
                }

                app.entities = {}
            }
        }
        Client_initSpaceData(stream) {
            app.clearSpace(false);

            app.spaceID = stream.readInt32();
            while (stream.length() > 0) {
                let key = stream.readString();
                let value = stream.readString();
                app.Client_setSpaceData(app.spaceID, key, value);
            }

            INFO_MSG("KBEngineApp::Client_initSpaceData: spaceID(" + app.spaceID + "), datas(" + app.spacedata + ")!");
        }
        Client_setSpaceData(spaceID, key, value) {
            INFO_MSG("KBEngineApp::Client_setSpaceData: spaceID(" + spaceID + "), key(" + key + "), value(" + value + ")!");

            app.spacedata[key] = value;

            if (key == "_mapping")
                app.addSpaceGeometryMapping(spaceID, value);

            Event.fire("onSetSpaceData", spaceID, key, value);
        }
        Client_delSpaceData(spaceID, key) {
            INFO_MSG("KBEngineApp::Client_delSpaceData: spaceID(" + spaceID + "), key(" + key + ")!");

            delete app.spacedata[key];
            Event.fire("onDelSpaceData", spaceID, key);
        }
        Client_getSpaceData(spaceID, key) {
            return app.spacedata[key];
        }
        Client_onUpdateBasePos(x, y, z) {
            app.entityServerPos.x = x;
            app.entityServerPos.y = y;
            app.entityServerPos.z = z;
        }
        Client_onUpdateBasePosXZ(x, z) {
            app.entityServerPos.x = x;
            app.entityServerPos.z = z;
        }
        Client_onUpdateData(stream) {
            let eid = app.getViewEntityIDFromStream(stream);
            let entity = app.entities[eid];
            if (entity == undefined) {
                ERROR_MSG("KBEngineApp::Client_onUpdateData: entity(" + eid + ") not found!");
                return;
            }
        }
        Client_onSetEntityPosAndDir(stream) {
            let eid = stream.readInt32();
            let entity = app.entities[eid];
            if (entity == undefined) {
                ERROR_MSG("KBEngineApp::Client_onSetEntityPosAndDir: entity(" + eid + ") not found!");
                return;
            }

            entity.position.x = stream.readFloat();
            entity.position.y = stream.readFloat();
            entity.position.z = stream.readFloat();
            entity.direction.x = stream.readFloat();
            entity.direction.y = stream.readFloat();
            entity.direction.z = stream.readFloat();

            // 记录玩家最后一次上报位置时自身当前的位置
            entity.entityLastLocalPos.x = entity.position.x;
            entity.entityLastLocalPos.y = entity.position.y;
            entity.entityLastLocalPos.z = entity.position.z;
            entity.entityLastLocalDir.x = entity.direction.x;
            entity.entityLastLocalDir.y = entity.direction.y;
            entity.entityLastLocalDir.z = entity.direction.z;

            entity.set_direction(entity.direction);
            entity.set_position(entity.position);
        }
        Client_onUpdateData_ypr(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let y = stream.readFloat();
            let p = stream.readFloat();
            let r = stream.readFloat();

            app._updateVolatileData(eid, KBE_FLT_MAX, KBE_FLT_MAX, KBE_FLT_MAX, y, p, r, -1);
        }
        Client_onUpdateData_yp(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let y = stream.readFloat();
            let p = stream.readFloat();

            app._updateVolatileData(eid, KBE_FLT_MAX, KBE_FLT_MAX, KBE_FLT_MAX, y, p, KBE_FLT_MAX, -1);
        }
        Client_onUpdateData_yr(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let y = stream.readFloat();
            let r = stream.readFloat();

            app._updateVolatileData(eid, KBE_FLT_MAX, KBE_FLT_MAX, KBE_FLT_MAX, y, KBE_FLT_MAX, r, -1);
        }
        Client_onUpdateData_pr(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let p = stream.readFloat();
            let r = stream.readFloat();

            app._updateVolatileData(eid, KBE_FLT_MAX, KBE_FLT_MAX, KBE_FLT_MAX, KBE_FLT_MAX, p, r, -1);
        }
        Client_onUpdateData_y(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let y = stream.readFloat();

            app._updateVolatileData(eid, KBE_FLT_MAX, KBE_FLT_MAX, KBE_FLT_MAX, y, KBE_FLT_MAX, KBE_FLT_MAX, -1);
        }
        Client_onUpdateData_p(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let p = stream.readFloat();

            app._updateVolatileData(eid, KBE_FLT_MAX, KBE_FLT_MAX, KBE_FLT_MAX, KBE_FLT_MAX, p, KBE_FLT_MAX, -1);
        }
        Client_onUpdateData_r(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let r = stream.readFloat();

            app._updateVolatileData(eid, KBE_FLT_MAX, KBE_FLT_MAX, KBE_FLT_MAX, KBE_FLT_MAX, KBE_FLT_MAX, r, -1);
        }
        Client_onUpdateData_xz(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            // let x = stream.readFloat(); 		let z = stream.readFloat();
            let x = stream.readFloat();
            let z = stream.readFloat();

            app._updateVolatileData(eid, x, KBE_FLT_MAX, z, KBE_FLT_MAX, KBE_FLT_MAX, KBE_FLT_MAX, 1);
        }
        Client_onUpdateData_xz_ypr(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let x = stream.readFloat();
            let z = stream.readFloat();

            let y = stream.readFloat();
            let p = stream.readFloat();
            let r = stream.readFloat();

            app._updateVolatileData(eid, x, KBE_FLT_MAX, z, y, p, r, 1);
        }
        Client_onUpdateData_xz_yp(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let x = stream.readFloat();
            let z = stream.readFloat();

            let y = stream.readFloat();
            let p = stream.readFloat();

            app._updateVolatileData(eid, x, KBE_FLT_MAX, z, y, p, KBE_FLT_MAX, 1);
        }
        Client_onUpdateData_xz_yr(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let x = stream.readFloat();
            let z = stream.readFloat();

            let y = stream.readFloat();
            let r = stream.readFloat();

            app._updateVolatileData(eid, x, KBE_FLT_MAX, z, y, KBE_FLT_MAX, r, 1);
        }
        Client_onUpdateData_xz_pr(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let x = stream.readFloat();
            let z = stream.readFloat();

            let p = stream.readFloat();
            let r = stream.readFloat();

            app._updateVolatileData(eid, x, KBE_FLT_MAX, z, KBE_FLT_MAX, p, r, 1);
        }
        Client_onUpdateData_xz_y(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let x = stream.readFloat();
            let z = stream.readFloat();
            let y = stream.readFloat();

            app._updateVolatileData(eid, x, KBE_FLT_MAX, z, y, KBE_FLT_MAX, KBE_FLT_MAX, 1);
        }
        Client_onUpdateData_xz_p(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let x = stream.readFloat();
            let z = stream.readFloat();
            let p = stream.readInt8();

            app._updateVolatileData(eid, x, KBE_FLT_MAX, z, KBE_FLT_MAX, p, KBE_FLT_MAX, 1);
        }
        Client_onUpdateData_xz_r(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let x = stream.readFloat();
            let z = stream.readFloat();

            let r = stream.readInt8();

            app._updateVolatileData(eid, x, KBE_FLT_MAX, z, KBE_FLT_MAX, KBE_FLT_MAX, r, 1);
        }
        Client_onUpdateData_xyz(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let x = stream.readFloat();
            let y = stream.readFloat();
            let z = stream.readFloat();

            app._updateVolatileData(eid, x, y, z, KBE_FLT_MAX, KBE_FLT_MAX, KBE_FLT_MAX, 0);
        }
        Client_onUpdateData_xyz_ypr(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let x = stream.readFloat();
            let y = stream.readFloat();
            let z = stream.readFloat();

            let yaw = stream.readFloat();
            let p = stream.readFloat();
            let r = stream.readFloat();

            app._updateVolatileData(eid, x, y, z, yaw, p, r, 0);
        }
        Client_onUpdateData_xyz_yp(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let x = stream.readFloat(); let z = stream.readFloat();
            let y = stream.readFloat();

            let yaw = stream.readFloat();
            let p = stream.readFloat();

            app._updateVolatileData(eid, x, y, z, yaw, p, KBE_FLT_MAX, 0);
        }
        Client_onUpdateData_xyz_yr(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let x = stream.readFloat(); let z = stream.readFloat();
            let y = stream.readFloat();

            let yaw = stream.readFloat();
            let r = stream.readFloat();

            app._updateVolatileData(eid, x, y, z, yaw, KBE_FLT_MAX, r, 0);
        }
        Client_onUpdateData_xyz_pr(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let x = stream.readFloat(); let z = stream.readFloat();
            let y = stream.readFloat();

            let p = stream.readFloat();
            let r = stream.readFloat();

            app._updateVolatileData(eid, x, y, z, KBE_FLT_MAX, p, r, 0);
        }
        Client_onUpdateData_xyz_y(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let x = stream.readFloat(); let z = stream.readFloat();
            let y = stream.readFloat();

            let yaw = stream.readFloat();

            app._updateVolatileData(eid, x, y, z, yaw, KBE_FLT_MAX, KBE_FLT_MAX, 0);
        }
        Client_onUpdateData_xyz_p(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let x = stream.readFloat(); let z = stream.readFloat();
            let y = stream.readFloat();

            let p = stream.readFloat();

            app._updateVolatileData(eid, x, y, z, KBE_FLT_MAX, p, KBE_FLT_MAX, 0);
        }
        Client_onUpdateData_xyz_r(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let x = stream.readFloat(); let z = stream.readFloat();
            let y = stream.readFloat();
            //todo 这个是自己加的，如果错误再修改
            let r = stream.readFloat();

            // let p = stream.readFloat();

            app._updateVolatileData(eid, x, y, z, r, KBE_FLT_MAX, KBE_FLT_MAX, 0);
        }
        Client_onUpdateData_ypr_optimized(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let y = stream.readInt8();
            let p = stream.readInt8();
            let r = stream.readInt8();

            app._updateVolatileData(eid, KBE_FLT_MAX, KBE_FLT_MAX, KBE_FLT_MAX, y, p, r, -1, true);
        }

        Client_onUpdateData_yp_optimized(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let y = stream.readInt8();
            let p = stream.readInt8();

            app._updateVolatileData(eid, KBE_FLT_MAX, KBE_FLT_MAX, KBE_FLT_MAX, y, p, KBE_FLT_MAX, -1, true);
        }

        Client_onUpdateData_yr_optimized(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let y = stream.readInt8();
            let r = stream.readInt8();

            app._updateVolatileData(eid, KBE_FLT_MAX, KBE_FLT_MAX, KBE_FLT_MAX, y, KBE_FLT_MAX, r, -1, true);
        }

        Client_onUpdateData_pr_optimized(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let p = stream.readInt8();
            let r = stream.readInt8();

            app._updateVolatileData(eid, KBE_FLT_MAX, KBE_FLT_MAX, KBE_FLT_MAX, KBE_FLT_MAX, p, r, -1, true);
        }

        Client_onUpdateData_y_optimized(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let y = stream.readInt8();

            app._updateVolatileData(eid, KBE_FLT_MAX, KBE_FLT_MAX, KBE_FLT_MAX, y, KBE_FLT_MAX, KBE_FLT_MAX, -1, true);
        }

        Client_onUpdateData_p_optimized(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let p = stream.readInt8();

            app._updateVolatileData(eid, KBE_FLT_MAX, KBE_FLT_MAX, KBE_FLT_MAX, KBE_FLT_MAX, p, KBE_FLT_MAX, -1, true);
        }

        Client_onUpdateData_r_optimized(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let r = stream.readInt8();

            app._updateVolatileData(eid, KBE_FLT_MAX, KBE_FLT_MAX, KBE_FLT_MAX, KBE_FLT_MAX, KBE_FLT_MAX, r, -1, true);
        }

        Client_onUpdateData_xz_optimized(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let xz = stream.readPackXZ();

            app._updateVolatileData(eid, xz[0], KBE_FLT_MAX, xz[1], KBE_FLT_MAX, KBE_FLT_MAX, KBE_FLT_MAX, 1, true);
        }

        Client_onUpdateData_xz_ypr_optimized(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let xz = stream.readPackXZ();

            let y = stream.readInt8();
            let p = stream.readInt8();
            let r = stream.readInt8();

            app._updateVolatileData(eid, xz[0], KBE_FLT_MAX, xz[1], y, p, r, 1, true);
        }

        Client_onUpdateData_xz_yp_optimized(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let xz = stream.readPackXZ();

            let y = stream.readInt8();
            let p = stream.readInt8();

            app._updateVolatileData(eid, xz[0], KBE_FLT_MAX, xz[1], y, p, KBE_FLT_MAX, 1, true);
        }

        Client_onUpdateData_xz_yr_optimized(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let xz = stream.readPackXZ();

            let y = stream.readInt8();
            let r = stream.readInt8();

            app._updateVolatileData(eid, xz[0], KBE_FLT_MAX, xz[1], y, KBE_FLT_MAX, r, 1, true);
        }

        Client_onUpdateData_xz_pr_optimized(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let xz = stream.readPackXZ();

            let p = stream.readInt8();
            let r = stream.readInt8();

            app._updateVolatileData(eid, xz[0], KBE_FLT_MAX, xz[1], KBE_FLT_MAX, p, r, 1, true);
        }

        Client_onUpdateData_xz_y_optimized(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let xz = stream.readPackXZ();

            let y = stream.readInt8();

            app._updateVolatileData(eid, xz[0], KBE_FLT_MAX, xz[1], y, KBE_FLT_MAX, KBE_FLT_MAX, 1, true);
        }

        Client_onUpdateData_xz_p_optimized(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let xz = stream.readPackXZ();

            let p = stream.readInt8();

            app._updateVolatileData(eid, xz[0], KBE_FLT_MAX, xz[1], KBE_FLT_MAX, p, KBE_FLT_MAX, 1, true);
        }

        Client_onUpdateData_xz_r_optimized(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let xz = stream.readPackXZ();

            let r = stream.readInt8();

            app._updateVolatileData(eid, xz[0], KBE_FLT_MAX, xz[1], KBE_FLT_MAX, KBE_FLT_MAX, r, 1, true);
        }

        Client_onUpdateData_xyz_optimized(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let xz = stream.readPackXZ();
            let y = stream.readPackY();

            app._updateVolatileData(eid, xz[0], y, xz[1], KBE_FLT_MAX, KBE_FLT_MAX, KBE_FLT_MAX, 0, true);
        }

        Client_onUpdateData_xyz_ypr_optimized(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let xz = stream.readPackXZ();
            let y = stream.readPackY();

            let yaw = stream.readInt8();
            let p = stream.readInt8();
            let r = stream.readInt8();

            app._updateVolatileData(eid, xz[0], y, xz[1], yaw, p, r, 0, true);
        }

        Client_onUpdateData_xyz_yp_optimized(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let xz = stream.readPackXZ();
            let y = stream.readPackY();

            let yaw = stream.readInt8();
            let p = stream.readInt8();

            app._updateVolatileData(eid, xz[0], y, xz[1], yaw, p, KBE_FLT_MAX, 0, true);
        }

        Client_onUpdateData_xyz_yr_optimized(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let xz = stream.readPackXZ();
            let y = stream.readPackY();

            let yaw = stream.readInt8();
            let r = stream.readInt8();

            app._updateVolatileData(eid, xz[0], y, xz[1], yaw, KBE_FLT_MAX, r, 0, true);
        }

        Client_onUpdateData_xyz_pr_optimized(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let xz = stream.readPackXZ();
            let y = stream.readPackY();

            let p = stream.readInt8();
            let r = stream.readInt8();

            app._updateVolatileData(eid, xz[0], y, xz[1], KBE_FLT_MAX, p, r, 0, true);
        }

        Client_onUpdateData_xyz_y_optimized(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let xz = stream.readPackXZ();
            let y = stream.readPackY();

            let yaw = stream.readInt8();

            app._updateVolatileData(eid, xz[0], y, xz[1], yaw, KBE_FLT_MAX, KBE_FLT_MAX, 0, true);
        }

        Client_onUpdateData_xyz_p_optimized(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let xz = stream.readPackXZ();
            let y = stream.readPackY();

            let p = stream.readInt8();

            app._updateVolatileData(eid, xz[0], y, xz[1], KBE_FLT_MAX, p, KBE_FLT_MAX, 0, true);
        }

        Client_onUpdateData_xyz_r_optimized(stream) {
            let eid = app.getViewEntityIDFromStream(stream);

            let xz = stream.readPackXZ();
            let y = stream.readPackY();

            let r = stream.readInt8();

            app._updateVolatileData(eid, xz[0], y, xz[1], r, KBE_FLT_MAX, KBE_FLT_MAX, 0, true);
        }
        _updateVolatileData(entityID, x, y, z, yaw, pitch, roll, isOnGround, isOptimized: boolean = false) {
            let entity = app.entities[entityID];
            if (entity == undefined) {
                // 如果为0且客户端上一步是重登陆或者重连操作并且服务端entity在断线期间一直处于在线状态
                // 则可以忽略这个错误, 因为cellapp可能一直在向baseapp发送同步消息， 当客户端重连上时未等
                // 服务端初始化步骤开始则收到同步信息, 此时这里就会出错。			
                ERROR_MSG("KBEngineApp::_updateVolatileData: entity(" + entityID + ") not found!");
                return;
            }

            // 小于0不设置
            if (isOnGround >= 0) {
                entity.isOnGround = (isOnGround > 0);
            }

            let changeDirection = false;

            if (roll != KBE_FLT_MAX) {
                changeDirection = true;
                entity.direction.x = int82angle(roll, false);
            }

            if (pitch != KBE_FLT_MAX) {
                changeDirection = true;
                entity.direction.y = int82angle(pitch, false);
            }

            if (yaw != KBE_FLT_MAX) {
                changeDirection = true;
                entity.direction.z = int82angle(yaw, false);
            }

            let done = false;
            if (changeDirection == true) {
                Event.fire("set_direction", entity);
                done = true;
            }

            let positionChanged = false;
            if (x != KBE_FLT_MAX || y != KBE_FLT_MAX || z != KBE_FLT_MAX)
                positionChanged = true;

            if (x == KBE_FLT_MAX) x = 0.0;
            if (y == KBE_FLT_MAX) y = 0.0;
            if (z == KBE_FLT_MAX) z = 0.0;

            if (positionChanged) {
                if (isOptimized) {
                    entity.position.x = x + KBEngine.app.entityServerPos.x;
                    entity.position.y = y + KBEngine.app.entityServerPos.y;
                    entity.position.z = z + KBEngine.app.entityServerPos.z;
                }
                else {
                    entity.position.x = x;
                    entity.position.y = y;
                    entity.position.z = z;
                }
                done = true;
                Event.fire("updatePosition", entity);
            }

            if (done)
                entity.onUpdateVolatileData();
        }
        Client_onStreamDataStarted(id, datasize, descr) {
            Event.fire(EventTypes.onStreamDataStarted, id, datasize, descr);
        }
        Client_onStreamDataRecv(stream) {
            let id = stream.readUint16();
            let data = stream.readBlob();
            Event.fire(EventTypes.onStreamDataRecv, id, data);
        }
        Client_onStreamDataCompleted(id) {
            Event.fire(EventTypes.onStreamDataCompleted, id);
        }
        Client_onReqAccountResetPasswordCB(failedcode) {
            if (failedcode != 0) {
                ERROR_MSG("KBEngineApp::Client_onReqAccountResetPasswordCB: " + app.username + " is failed! code=" + app.serverErrs[failedcode].name + "!");
                return;
            }

            INFO_MSG("KBEngineApp::Client_onReqAccountResetPasswordCB: " + app.username + " is successfully!");
        }
        Client_onReqAccountBindEmailCB(failedcode) {
            if (failedcode != 0) {
                ERROR_MSG("KBEngineApp::Client_onReqAccountBindEmailCB: " + app.username + " is failed! code=" + app.serverErrs[failedcode].name + "!");
                return;
            }

            INFO_MSG("KBEngineApp::Client_onReqAccountBindEmailCB: " + app.username + " is successfully!");
        }
        Client_onReqAccountNewPasswordCB(failedcode) {
            if (failedcode != 0) {
                ERROR_MSG("KBEngineApp::Client_onReqAccountNewPasswordCB: " + app.username + " is failed! code=" + app.serverErrs[failedcode].name + "!");
                return;
            }

            INFO_MSG("KBEngineApp::Client_onReqAccountNewPasswordCB: " + app.username + " is successfully!");
        }
    }
    // 描述服务端返回的错误信息
    export class ServerErr {
        name = "";
        descr = "";
        id = 0;
    }
    export const FragmentDataTypes = {
        FRAGMENT_DATA_UNKNOW: 0,
        FRAGMENT_DATA_MESSAGE_ID: 1,
        FRAGMENT_DATA_MESSAGE_LENGTH: 2,
        FRAGMENT_DATA_MESSAGE_LENGTH1: 3,
        FRAGMENT_DATA_MESSAGE_BODY: 4
    };
    export let app: KBEngineApp;
    let idInterval;
    export function create(args: KBEngineArgs) {
        if (app != undefined)
            return;

        new KBEngineApp(args);

        app.reset();
        app.installEvents();
        idInterval = setInterval(app.update, args.updateHZ);
    }
    export function destroy() {
        if (idInterval != undefined)
            clearInterval(idInterval);

        if (app == undefined)
            return;

        app.uninstallEvents();
        app.reset();
        app = undefined;
        Event.clear();
    }
}
