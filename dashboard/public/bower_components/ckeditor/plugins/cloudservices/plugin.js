﻿/*
 Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
*/
;(function () {
  CKEDITOR.plugins.add('cloudservices', {
    requires: 'filetools,ajax',
    onLoad: function () {
      function a(a, b, f, d) {
        c.call(this, a, b, f)
        this.customToken = d
      }
      var c = CKEDITOR.fileTools.fileLoader
      a.prototype = CKEDITOR.tools.extend({}, c.prototype)
      a.prototype.upload = function (a, b) {
        ;(a = a || this.editor.config.cloudServices_uploadUrl)
          ? c.prototype.upload.call(this, a, b)
          : CKEDITOR.error('cloudservices-no-upload-url')
      }
      CKEDITOR.plugins.cloudservices.cloudServicesLoader = a
    },
    beforeInit: function (a) {
      var c = a.config.cloudServices_tokenUrl,
        e = {
          token: null,
          REFRESH_INTERVAL: a.CLOUD_SERVICES_TOKEN_INTERVAL || 36e5,
          refreshToken: function () {
            CKEDITOR.ajax.load(c, function (b) {
              b && (e.token = b)
            })
          },
          init: function () {
            this.refreshToken()
            var b = window.setInterval(this.refreshToken, this.REFRESH_INTERVAL)
            a.once('destroy', function () {
              window.clearInterval(b)
            })
          },
        }
      c ? e.init() : CKEDITOR.error('cloudservices-no-token-url')
      a.on(
        'fileUploadRequest',
        function (b) {
          var a = b.data.fileLoader,
            d = b.data.requestData,
            c = a.customToken || e.token
          a instanceof CKEDITOR.plugins.cloudservices.cloudServicesLoader &&
            ((d.file = d.upload),
            delete d.upload,
            c
              ? b.data.fileLoader.xhr.setRequestHeader('Authorization', c)
              : (CKEDITOR.error('cloudservices-no-token'), b.cancel()))
        },
        null,
        null,
        6
      )
      a.on('fileUploadResponse', function (a) {
        var c = a.data.fileLoader,
          d = c.xhr,
          e
        if (c instanceof CKEDITOR.plugins.cloudservices.cloudServicesLoader) {
          a.stop()
          try {
            ;(e = JSON.parse(d.responseText)), (a.data.response = e)
          } catch (g) {
            CKEDITOR.warn('filetools-response-error', {
              responseText: d.responseText,
            })
          }
        }
      })
    },
  })
  CKEDITOR.plugins.cloudservices = { cloudServicesLoader: null }
})()
