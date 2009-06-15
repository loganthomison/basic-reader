<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
    xmlns:xlink="http://www.w3.org/1999/xlink"
    xmlns:exsl="http://exslt.org/common"
    version="1.0">
    <xsl:import href="beta-uni-util.xsl"/>
    <xsl:import href="normalize-greek.xsl"/>
    
    <xsl:template name="make_ref_link">
        <xsl:param name="target"/>
        <xsl:if test="$target">
            <xsl:variable name="link_elem">
                <xsl:element name="reflink">
                    <xsl:attribute name="xmlns:xlink">http://www.w3.org/1999/xlink</xsl:attribute>
                    <xsl:attribute name="xlink:href">
                        <xsl:value-of select="substring-before($target,'|')"/>
                    </xsl:attribute>
                    <xsl:value-of select="substring-after($target,'|')"/>
                </xsl:element>
            </xsl:variable>
            <xsl:apply-templates select="exsl:node-set($link_elem)"/>
        </xsl:if>    
    </xsl:template>
    
    <xsl:template match="reflink">
        <a href="{@xlink:href}" class="alph-reflink"><xsl:value-of select="."/></a>
    </xsl:template>
    <xsl:template name="add-footnote">
        <xsl:param name="item"/>
        <xsl:if test="$item/@footnote">
            <xsl:call-template name="footnote-tokens">
                <xsl:with-param name="list" select="$item/@footnote"/>
                <xsl:with-param name="delimiter" select="' '"/>
            </xsl:call-template>   
        </xsl:if>
    </xsl:template>    
    
    <xsl:template name="add-dialect">
        <xsl:param name="item"/>
        <xsl:if test="$item/@dialects">
            <a href="#dialect" class="footnote">D</a>
            <span class="footnote-text"><xsl:value-of select="$item/@dialects"/></span>
            <xsl:if test="$item/@footnote">
                <span class="footnote-delimiter">,</span>
            </xsl:if>
        </xsl:if>
    </xsl:template>    
    
    <xsl:template name="footnote-tokens">
        <xsl:param name="list" />
        <xsl:param name="delimiter" />
        <xsl:variable name="newlist">
            <xsl:choose>
                <xsl:when test="contains($list, $delimiter)"><xsl:value-of select="normalize-space($list)" /></xsl:when>
                <xsl:otherwise><xsl:value-of select="concat(normalize-space($list), $delimiter)"/></xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <xsl:variable name="first" select="substring-before($newlist, $delimiter)" />
        <xsl:variable name="remaining" select="substring-after($newlist, $delimiter)" />
        <xsl:variable name="num" select="substring-after($first,'-')"/>
        <a href="#{$first}" class="footnote"><xsl:value-of select="$num"/></a>
        <span class="footnote-text"><xsl:apply-templates select="key('footnotes',$first)"/></span>
        <xsl:if test="$remaining">
            <span class="footnote-delimiter">,</span>
            <xsl:call-template name="footnote-tokens">
                <xsl:with-param name="list" select="$remaining" />
                <xsl:with-param name="delimiter"><xsl:value-of select="$delimiter"/></xsl:with-param>
            </xsl:call-template>
        </xsl:if>
    </xsl:template>
    
    <xsl:template match="ul">
        <xsl:copy-of select="."/>
    </xsl:template>

    <!-- template to produce header for stem header row -->
    <xsl:template name="stem-header">
        <xsl:param name="header"/>
        <xsl:if test="$header='decl' or $header='conj'">
            <br/><span class="header-text">stem</span>
        </xsl:if>
    </xsl:template>
    
    <!-- template to produce data for stem header row -->
    <xsl:template name="stem-data" match="order-item[@attname='decl' or @attname='conj']">
        <xsl:call-template name="add-footnote">
            <xsl:with-param name="item" select="."/>
        </xsl:call-template>                                
        <br/>
        <xsl:variable name="thistext" select="text()"/>
        <xsl:apply-templates select="/infl-data/stem-table/stem[@decl=$thistext or @conj=$thistext]"/>
    </xsl:template>
    
    <xsl:template name="no-sub" match="order-item">
        <xsl:call-template name="add-footnote">
            <xsl:with-param name="item" select="."/>
        </xsl:call-template>        
    </xsl:template>
    
    <xsl:template match="stem">
        <span class="stem"><xsl:value-of select="text()"/></span>
        <xsl:if test="stem-class">
            <ul class="stem-class-block">
                <li class="stem-class-toggle header-text">stem-classes</li>
                <ul class="stem-classes">
                    <xsl:apply-templates select="stem-class"/>                
                </ul>
            </ul>
        </xsl:if>
    </xsl:template>
    
    <xsl:template match="stem-class">
        <li id="{@id}" class="{@type}"><span class="stem-class-desc"><xsl:apply-templates select="reflink"/></span></li>        
    </xsl:template>
    
    <!-- caption containing the selected form and the stem/suffixes from the selected
         endings parameter
    -->
    <xsl:template name="form_caption">
        <xsl:param name="selected_endings"/>
        <xsl:param name="form"/>
        <xsl:param name="has_data"/>
        <div class="alph-infl-form">
            <xsl:value-of select="$form"/>
            <xsl:if test="$selected_endings//span[@class='alph-term']">
                (
                <xsl:for-each select="$selected_endings//span[@class='alph-term']">
                    <xsl:if test="position() &gt; 1">
                        , 
                    </xsl:if>
                    <div class="alph-infl-term"><xsl:copy-of select="current()"/></div>    
                </xsl:for-each>
                )
                
            </xsl:if>
            <xsl:if test="$has_data and $selected_endings and ($normalize_greek or $translit_ending_table_match)">
                <div class="alpheios-hint">Highlighted matches may ignore some vowel accents.</div>
            </xsl:if>
        </div>
    </xsl:template>
    
    <!-- pull the text from the selected endings out for matching -->
    <xsl:template name="text_for_match">
        <xsl:param name="selected_endings"/>
        <xsl:param name="normalize_greek"/>
        <xsl:param name="match_form"/>
        <xsl:for-each select="$selected_endings//span[contains(@class,'alph-term')]">
            <xsl:variable name="to_strip">
                <xsl:choose>
                    <xsl:when test="$match_form != ''"><xsl:value-of select="$match_form"/></xsl:when>
                     <xsl:when test="span[contains(@class,'alph-suff')]/text() != ''">
                         <xsl:value-of select="span[contains(@class,'alph-suff')]/text()"/>
                     </xsl:when>
                     <xsl:otherwise>_</xsl:otherwise>
                </xsl:choose>                        
            </xsl:variable>
            <xsl:text>|</xsl:text>
            <xsl:choose>
                <xsl:when test="$normalize_greek and not($to_strip='_')">
                    <xsl:variable name="normalized">
                        <xsl:call-template name="normalize-greek">
                            <xsl:with-param name="input" select="normalize-space($to_strip)"/>
                            <xsl:with-param name="strip">/\^_</xsl:with-param>
                        </xsl:call-template>
                    </xsl:variable>
                    <xsl:call-template name="normalize-greek">
                        <xsl:with-param name="input" select="normalize-space($to_strip)"/>
                        <xsl:with-param name="strip">/\^_</xsl:with-param>
                    </xsl:call-template>
                </xsl:when>
                <xsl:otherwise><xsl:value-of select="normalize-space($to_strip)"/></xsl:otherwise>
            </xsl:choose>
            <xsl:text>|</xsl:text>
        </xsl:for-each>
    </xsl:template>
    
    <xsl:template match="disclaimer">
        <div id="alph-infl-disclaimer" class="alpheios-hint">
            <xsl:apply-templates/>
        </div>
    </xsl:template>
    
</xsl:stylesheet>