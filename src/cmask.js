/**
 * @fileoverview 1D/2D array data compression
 *
 * @author Jingbo <jingbo@connect.ust.hk>
 */

/**
 * @class cmask
 */
var cmask = {
  // ////////////////////////////////////////////////////////////////////////
  // !NOTE: the num must be in the range [0, 50]
  decodeNumMat: function (_packed) {
    var width = _packed.width
    var height = _packed.height
    var data = _packed.data

    var seriealize = this.decodeNumArray(data)
    var ind = 0
    var mat = []
    for (var coli = 0; coli < width; coli++) {
      mat[coli] = []
      for (var rowi = 0; rowi < height; rowi++) {
        mat[coli][rowi] = seriealize[ind]
        ind++
      }
    }
    return mat
  },

  encodeNumMat: function (_mat) {
    var width = _mat.length
    var height = _mat[0].length
    var seriealize = []
    for (var coli = 0; coli < width; coli++) {
      for (var rowi = 0; rowi < height; rowi++) {
        seriealize.push(_mat[coli][rowi])
      }
    }
    var data = this.encodeNumArray(seriealize)
    return {
      width: width,
      height: height,
      data: data
    }
  },

  _firstChar: 48,

  decodeNumArray: function (encodedText) {
    var result = []
    var temp = []
    var index
    for (index = 0; index < encodedText.length; index += 3) {
      // skipping bounds checking because the encoded text is assumed to be valid
      var firstChar = encodedText.charAt(index).charCodeAt() - this._firstChar
      var secondChar = encodedText.charAt(index + 1).charCodeAt() - this._firstChar
      var thirdChar = encodedText.charAt(index + 2).charCodeAt() - this._firstChar

      temp.push((firstChar >> 2) & 0x3F) // 6 bits, 'a'
      temp.push(((firstChar & 0x03) << 4) | ((secondChar >> 4) & 0xF)) // 2 bits + 4 bits, 'b'
      temp.push(((secondChar & 0x0F) << 2) | ((thirdChar >> 6) & 0x3)) // 4 bits + 2 bits, 'c'
      temp.push(thirdChar & 0x3F) // 6 bits, 'd'
    }

    // filter out 'padding' numbers, if present; this is an extremely inefficient way to do it
    for (index = 0; index < temp.length; index++) {
      if (temp[index] !== 63) {
        result.push(temp[index])
      }
    }

    return result
  },

  encodeNumArray: function (dataSet) {
    var encodedData = []

    for (var index = 0; index < dataSet.length; index += 4) {
      var num1 = dataSet[index]
      var num2 = index + 1 < dataSet.length ? dataSet[index + 1] : 63
      var num3 = index + 2 < dataSet.length ? dataSet[index + 2] : 63
      var num4 = index + 3 < dataSet.length ? dataSet[index + 3] : 63

      this.encodeSet(num1, num2, num3, num4, encodedData)
    }

    // return encodedData
    return this.stringFromArray(encodedData)
  },

  stringFromArray: function (array) {
    var result = ''
    for (var index = 0; index < array.length; index++) {
      result += array[index]
    }

    return result
  },

  encodeSet: function (a, b, c, d, outArray) {
    // we can encode 4 numbers in 3 bytes
    var firstChar = ((a & 0x3F) << 2) | ((b >> 4) & 0x03) // 6 bits for 'a', 2 from 'b'
    var secondChar = ((b & 0x0F) << 4) | ((c >> 2) & 0x0F) // remaining 4 bits from 'b', 4 from 'c'
    var thirdChar = ((c & 0x03) << 6) | (d & 0x3F) // remaining 2 bits from 'c', 6 bits for 'd'

    // add _firstChar so that all values map to a printable character
    outArray.push(String.fromCharCode(firstChar + this._firstChar))
    outArray.push(String.fromCharCode(secondChar + this._firstChar))
    outArray.push(String.fromCharCode(thirdChar + this._firstChar))
  },

  // ////////////////////////////////////////////////////////////////////////

  pack_boolean: function (_bool_mat) {
    var pack = {
      width: _bool_mat.length,
      height: _bool_mat[0].length,
      data: [] // start with false
    }
    var cnt = 0
    var validate_cnt = 0 // count the total number of entries
    var tot_cnt = 0
    var cnt_a = 0
    var cnt_b = 0
    var cnt_c = 0
    var cnt_state = false // counting 0 (false) or 1 (true) currently
    for (var rowi = 0; rowi < _bool_mat.length; rowi++) {
      for (var coli = 0; coli < _bool_mat[rowi].length; coli++) {
        if (_bool_mat[rowi][coli] === cnt_state) {
          cnt++
          cnt_a++
        } else if (_bool_mat[rowi][coli] === !cnt_state) {
          pack.data.push(cnt)
          validate_cnt += cnt
          cnt_state = !cnt_state // _bool_mat[rowi][coli]
          cnt = 1
          cnt_b++
        } else {
          console.warn('Error: unknown entry [' + rowi + ',' + coli + ']=' + _bool_mat[rowi][coli])
          cnt_c++
        }

        tot_cnt++
      }
    }
    // the last count
    pack.data.push(cnt)
    validate_cnt += cnt

    // console.log('cnt entries ' + validate_cnt + '/' + pack.width * pack.height)
    return pack
  },

  unpack_boolean: function (_pack) {
    // console.log('unpack mask', _pack)
    var width = _pack.width
    var height = _pack.height
    var data = _pack.data // starts with false
    // create 2D array
    var mat = []
    var rowi = height
    while (rowi--) {
      mat[rowi] = []
    }
    // assign values
    var state = false // start with false
    rowi = 0
    var coli = 0
    let timeStep = 16
    for (let step = 0; step < data.length; step += timeStep) {
    // for (let ci = 0; ci < data.length; ci++) {
    // setTimeout(() => {
      for (let ci = 0; ci < timeStep; ++ci) {
        let cnt = data[ci + step]
        let npos = fillMatValue(rowi, coli, cnt, state)
        // update position
        rowi = npos.row
        coli = npos.col
        // flip state
        state = !state
      }
    // }, 0)
    }

    return mat

    function fillMatValue (_row, _col, _length, _val) {
      var val_length = _length
      var rowj = _row
      var colj = _col

      while (val_length--) {
        mat[rowj][colj] = _val
        colj++
        if (colj === width) {
          rowj++
          colj = 0
        }
      }
      return {
        row: rowj,
        col: colj
      }
    }
  },

  unpackToImage: function (_pack) {
    var width = _pack.width
    var height = _pack.height
    var data = _pack.data // starts with false
    // create 2D array
    // var mat = []
    // var rowi = height
    // while (rowi--) {
    //   mat[rowi] = []
    // }
    let rgb = new Uint8ClampedArray(width * height * 4)
    let cnt_white = 0

    // assign values
    var state = false // start with false
    // let state = 0
    let rowi = 0
    var coli = 0
    let timeStep = 16
    for (let step = 0; step < data.length; step += timeStep) {
    // for (let ci = 0; ci < data.length; ci++) {
    // setTimeout(() => {
      for (let ci = 0; ci < timeStep; ++ci) {
        let cnt = data[ci + step]
        let npos = fillMatValue(rowi, coli, cnt, (state ? 255 : 0))
        // update position
        rowi = npos.row
        coli = npos.col
        // flip state
        cnt_white = cnt_white + (state === true ? 1 : 0)
        state = !state
      }
    // }, 0)
    }
    let res = {
      rgba: rgb,
      cntWhite: cnt_white
    }
    return res
    // return mat

    function fillMatValue (_row, _col, _length, _val) {
      var val_length = _length
      var rowj = _row
      var colj = _col
      let baseId = (rowj * width + colj) * 4
      while (val_length--) {
        // rgb[rowj][colj] = _val
        rgb[baseId] = rgb[baseId + 1] = rgb[baseId + 2] = rgb[baseId + 3] = _val
        baseId = baseId + 4
        colj++
        if (colj === width) {
          rowj++
          colj = 0
        }
      }
      return {
        row: rowj,
        col: colj
      }
    }
  },

  packImage: function (_image) {
    // reverse of unpackToImage
    let rgba = _image.rgba
    let data = []
    let numberToEncode = 0 // encode 0 first
    let cnt = 0
    for (let i = 0; i < rgba.length; i += 4) {
      if (rgba[i] === numberToEncode) {
        cnt += 1
      }
      if (i + 4 >= rgba.length || rgba[i + 4] !== numberToEncode) {
        data.push(cnt)
        cnt = 0
        numberToEncode = 255 - numberToEncode
      }
    }
    return {data}
  },

  downsampleImage: function (_img_data, width, height, downsample) {
    const sw = Math.floor(width * downsample)
    const sh = Math.floor(height * downsample)
    const slen = sw * sh * 4
    let simg = new Uint8ClampedArray(slen)
    let cnt_white = 0
    // const row_step = 4 * width
    // const step = 4 / downsample
    let sp = 0
    let p = 0
    for (let si = 0; si < sh; ++si) {
      // p = p + row_step
      for (let sj = 0; sj < sw; ++sj) {
        sp = (si * sw + sj) * 4
        p = ((si / downsample) * width + sj / downsample) * 4
        // sp = sp + 4
        // p = p + step
        simg[sp] = _img_data[p]
        simg[sp + 1] = _img_data[p + 1]
        simg[sp + 2] = _img_data[p + 2]
        simg[sp + 3] = _img_data[p + 3]
        cnt_white = cnt_white + (simg[sp] !== 0 ? 1 : 0)
      }
    }
    return {
      rgba: simg,
      cntWhite: cnt_white
    }
  }
  /*
      references:
          bit-wise pack: https://www.smashingmagazine.com/2011/10/optimizing-long-lists-of-yesno-values-with-javascript/
          zero padding: http://stackoverflow.com/questions/13859538/simplest-inline-method-to-left-pad-a-string
  */
  // pack : function (/* string */ values) {
  //     var chunks = values.match(/.{1,16}/g), packed = ''
  //     for (var i=0; i < chunks.length; i++) {
  //         packed += String.fromCharCode(parseInt(chunks[i], 2))
  //     }
  //     return packed
  // },

// unpack : function(/* string */ packed) {
//     var values = ''
//     for (var i=0; i < packed.length; i++) {
//         values += ("0000000000000000" + packed.charCodeAt(i).toString(2)).slice(-16)   // left padding with zeros
//     }
//     return values
// },
}

export default cmask
